import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import {
    sendOrderConfirmationEmail,
    sendAdminNewOrderEmail,
    sendAdminLowStockEmail,
    sendOrderStatusEmail,
} from "../utils/email.js";
const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD) || 5;

// Create new order (COD)
export const createOrder = async (req, res) => {
    const runOrderLogic = async (sessionOption = {}) => {
        const {
            items,
            shippingInfo,
            paymentMethod = "COD",
            shippingCost: inputShippingCost = 0,
            tax: inputTax = 0,
        } = req.body;

        // ── Basic validation ──────────────────────────────────────────────
        if (!items || items.length === 0) {
            throw new Error("No items in order");
        }

        if (!shippingInfo) {
            throw new Error("Shipping information is required");
        }

        const requiredShippingFields = ["fullName", "email", "phone", "address", "city", "state", "country"];
        for (const field of requiredShippingFields) {
            if (!shippingInfo[field] || typeof shippingInfo[field] !== 'string' || !shippingInfo[field].trim()) {
                throw new Error(`Shipping information is missing or invalid field: ${field}`);
            }
        }

        // ── Phase 1: validate all products exist and have enough stock ────
        const productDocs = [];
        for (const item of items) {
            if (!item.product || item.quantity < 1) {
                throw new Error("Invalid item in order");
            }

            const product = await Product.findById(item.product, null, sessionOption);

            if (!product) {
                throw new Error("Product not found");
            }

            if (product.stock < item.quantity) {
                throw new Error(`"${product.title}" only has ${product.stock} unit${product.stock === 1 ? '' : 's'} left in stock`);
            }

            productDocs.push({ product, quantity: item.quantity });
        }

        // ── Phase 2: atomically decrement stock for each item ─────────────
        for (const { product, quantity } of productDocs) {
            const updated = await Product.findOneAndUpdate(
                {
                    _id: product._id,
                    stock: { $gte: quantity }, // atomic guard
                },
                { $inc: { stock: -quantity } },
                { new: true, ...sessionOption }
            );

            if (!updated) {
                throw new Error(`"${product.title}" just sold out. Please update your cart.`);
            }

            if (product.stock > LOW_STOCK_THRESHOLD && updated.stock <= LOW_STOCK_THRESHOLD) {
                sendAdminLowStockEmail(updated, updated.stock).catch(() => {});
            }
        }

        // ── Phase 3: build order items from fetched product docs ──────────
        let calculatedSubtotal = 0;
        const orderItems = productDocs.map(({ product, quantity }) => {
            calculatedSubtotal += product.price * quantity;
            return {
                product:  product._id,
                title:    product.title,
                price:    product.price,
                quantity,
                image:    product.images?.[0] || "",
            };
        });

        const finalShippingCost = Number(inputShippingCost) || 0;
        const finalTax = Number(inputTax) || 0;
        const calculatedTotal = calculatedSubtotal + finalShippingCost + finalTax;

        // ── Phase 4: create the order ──────────────────────────────────────
        const [order] = await Order.create([{
            user: req.user._id,
            items: orderItems,
            shippingInfo,
            paymentMethod,
            paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
            subtotal: calculatedSubtotal,
            shippingCost: finalShippingCost,
            tax: finalTax,
            total: calculatedTotal,
        }], sessionOption);

        // Clear user's cart after successful order
        await Cart.findOneAndUpdate(
            { user: req.user._id },
            { items: [] },
            sessionOption
        );

        return order;
    };

    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const order = await runOrderLogic({ session });

        await session.commitTransaction();
        session.endSession();

        await order.populate("items.product");

        // Send order confirmation email — fire and forget
        User.findById(req.user._id).select("name email").then(user => {
            if (!user) return;
            sendOrderConfirmationEmail(user, order).catch(() => {});
            sendAdminNewOrderEmail(order, user).catch(() => {});
        }).catch(() => {});

        return res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order,
        });
    } catch (error) {
        if (session) {
            await session.abortTransaction().catch(() => {});
            session.endSession();
        }

        // Fallback for local standalone MongoDB (where replica set transactions are not supported)
        if (error.message && error.message.includes("replica set")) {
            try {
                const order = await runOrderLogic({});

                await order.populate("items.product");

                User.findById(req.user._id).select("name email").then(user => {
                    if (!user) return;
                    sendOrderConfirmationEmail(user, order).catch(() => {});
                    sendAdminNewOrderEmail(order, user).catch(() => {});
                }).catch(() => {});

                return res.status(201).json({
                    success: true,
                    message: "Order placed successfully",
                    order,
                });
            } catch (fallbackError) {
                const isClientError = fallbackError.message.includes('sold out') || 
                                      fallbackError.message.includes('No items') || 
                                      fallbackError.message.includes('Shipping information') || 
                                      fallbackError.message.includes('Invalid item') || 
                                      fallbackError.message.includes('not found') || 
                                      fallbackError.message.includes('only has');
                                      
                return res.status(isClientError ? 400 : 500).json({
                    success: false,
                    message: fallbackError.message,
                });
            }
        }

        // If it's a validation error (like sold out, or missing info), return 400
        const isClientError = error.message.includes('sold out') || 
                              error.message.includes('No items') || 
                              error.message.includes('Shipping information') || 
                              error.message.includes('Invalid item') || 
                              error.message.includes('not found') || 
                              error.message.includes('only has');
                              
        res.status(isClientError ? 400 : 500).json({
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
        const {
            search,
            status,
            dateFrom,
            dateTo,
            page = 1,
            limit = 20,
        } = req.query;

        const query = {};

        // Status filter
        if (status && status !== 'all') {
            query.orderStatus = status;
        }

        // Date range filter (orderDate)
        if (dateFrom || dateTo) {
            query.orderDate = {};
            if (dateFrom) query.orderDate.$gte = new Date(dateFrom);
            if (dateTo) query.orderDate.$lte = new Date(dateTo);
        }

        // If search provided, try to match by order id tail or user name/email
        let userIds = null;
        if (search?.trim()) {
            const s = search.trim();

            // If looks like an object id tail (e.g. last 6-8 chars), allow regex on _id
            const idRegex = new RegExp(s, 'i');

            // Find users with matching name or email
            const matchedUsers = await User.find({
                $or: [
                    { name:  { $regex: s, $options: 'i' } },
                    { email: { $regex: s, $options: 'i' } },
                ],
            }).select('_id');

            userIds = matchedUsers.map(u => u._id);

            query.$or = [
                { _id: { $regex: idRegex } },
            ];

            if (userIds.length > 0) query.$or.push({ user: { $in: userIds } });
        }

        // Pagination
        const pageNum  = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
        const skip     = (pageNum - 1) * limitNum;

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate('items.product')
                .populate('user', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Order.countDocuments(query),
        ]);

        const totalRevenueAgg = await Order.aggregate([
            { $match: query },
            { $group: { _id: null, total: { $sum: '$total' } } },
        ]);
        const totalRevenue = totalRevenueAgg[0]?.total ?? 0;

        res.status(200).json({
            success: true,
            orders,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore: pageNum < Math.ceil(total / limitNum),
            },
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

        // Send status update email for meaningful status changes
        const notifyStatuses = ["Confirmed", "Shipped", "Delivered", "Cancelled"];
        if (orderStatus && notifyStatuses.includes(orderStatus) && orderStatus !== previousStatus) {
            const user = order.user;
            if (user && user.email) {
                sendOrderStatusEmail(user, order, orderStatus).catch(() => {});
            }
        }

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
