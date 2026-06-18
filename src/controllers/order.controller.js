import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";

// Create new order (COD)
export const createOrder = async (req, res) => {
    try {
        const {
            items,
            shippingInfo,
            paymentMethod = "COD",
            subtotal,
            shippingCost,
            tax,
            total,
        } = req.body;

        // ── Basic validation ──────────────────────────────────────────────
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No items in order",
            });
        }

        if (!shippingInfo) {
            return res.status(400).json({
                success: false,
                message: "Shipping information is required",
            });
        }

        // ── Phase 1: validate all products exist and have enough stock ────
        // Do this BEFORE touching any stock so we never partially decrement
        const productDocs = [];
        for (const item of items) {
            if (!item.product || item.quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid item in order",
                });
            }

            const product = await Product.findById(item.product);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product not found`,
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `"${product.title}" only has ${product.stock} unit${
                        product.stock === 1 ? '' : 's'
                    } left in stock`,
                });
            }

            productDocs.push({ product, quantity: item.quantity });
        }

        // ── Phase 2: atomically decrement stock for each item ─────────────
        // Uses findOneAndUpdate with $inc + $gte condition — if the document
        // no longer satisfies stock >= quantity (race condition), the update
        // returns null and we roll back already-decremented items.
        const decremented = [];
        for (const { product, quantity } of productDocs) {
            const updated = await Product.findOneAndUpdate(
                {
                    _id:   product._id,
                    stock: { $gte: quantity }, // atomic guard
                },
                { $inc: { stock: -quantity } },
                { new: true },
            );

            if (!updated) {
                // Roll back all decrements that already succeeded
                if (decremented.length > 0) {
                    await Promise.all(
                        decremented.map(({ id, qty }) =>
                            Product.findByIdAndUpdate(id, { $inc: { stock: qty } }),
                        ),
                    );
                }
                return res.status(400).json({
                    success: false,
                    message: `"${product.title}" just sold out. Please update your cart.`,
                });
            }

            decremented.push({ id: product._id, qty: quantity });
        }

        // ── Phase 3: build order items from fetched product docs ──────────
        const orderItems = productDocs.map(({ product, quantity }) => ({
            product:  product._id,
            title:    product.title,
            price:    product.price,
            quantity,
            image:    product.images?.[0] || "",
        }));

        // ── Phase 4: create the order ──────────────────────────────────────
        const order = await Order.create({
            user: req.user._id,
            items: orderItems,
            shippingInfo,
            paymentMethod,
            paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
            subtotal,
            shippingCost,
            tax,
            total,
        });

        // Clear user's cart after successful order
        await Cart.findOneAndUpdate(
            { user: req.user._id },
            { items: [] },
        );

        await order.populate("items.product");

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get user's orders
export const getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('items.product')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            orders,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get single order
export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product')
            .populate('user', 'name email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // Check if order belongs to user (unless admin)
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get all orders (Admin only)
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('items.product')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

        res.status(200).json({
            success: true,
            orders,
            totalOrders: orders.length,
            totalRevenue,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update order status (Admin only)
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderStatus, paymentStatus } = req.body;

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        const previousStatus = order.orderStatus;

        if (orderStatus) {
            order.orderStatus = orderStatus;
            if (orderStatus === "Delivered") {
                order.deliveredAt = Date.now();
                order.paymentStatus = "Paid";
            }
            if (
                orderStatus === "Cancelled" &&
                previousStatus !== "Cancelled"
            ) {
                for (const item of order.items) {
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { stock: item.quantity },
                    });
                }
            }
        }

        if (paymentStatus) {
            order.paymentStatus = paymentStatus;
        }

        await order.save();
        await order.populate("items.product");
        await order.populate("user", "name email");

        res.status(200).json({
            success: true,
            message: "Order updated successfully",
            order,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Cancel order
export const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // Check if order belongs to user
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }

        // Can only cancel if order is still processing
        if (order.orderStatus !== "Processing") {
            return res.status(400).json({
                success: false,
                message: "Cannot cancel order at this stage",
            });
        }

        // Restore stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } }
            );
        }

        order.orderStatus = "Cancelled";
        await order.save();

        res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            order,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
