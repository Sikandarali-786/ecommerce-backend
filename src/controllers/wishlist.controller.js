import Wishlist from "../models/wishlist.model.js";
import Product from "../models/product.model.js";

// Get user's wishlist
export const getWishlist = async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user._id })
            .populate('products');

        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user._id, products: [] });
        }

        res.status(200).json({
            success: true,
            wishlist,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Add product to wishlist
export const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Find or create wishlist
        let wishlist = await Wishlist.findOne({ user: req.user._id });
        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user._id, products: [] });
        }

        // Check if product already in wishlist
        if (wishlist.products.includes(productId)) {
            return res.status(400).json({
                success: false,
                message: "Product already in wishlist",
            });
        }

        // Add product to wishlist
        wishlist.products.push(productId);
        await wishlist.save();
        await wishlist.populate('products');

        res.status(200).json({
            success: true,
            message: "Product added to wishlist",
            wishlist,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Remove product from wishlist
export const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({ user: req.user._id });
        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: "Wishlist not found",
            });
        }

        // Remove product from wishlist
        wishlist.products = wishlist.products.filter(
            id => id.toString() !== productId
        );

        await wishlist.save();
        await wishlist.populate('products');

        res.status(200).json({
            success: true,
            message: "Product removed from wishlist",
            wishlist,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Clear wishlist
export const clearWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user._id });
        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: "Wishlist not found",
            });
        }

        wishlist.products = [];
        await wishlist.save();

        res.status(200).json({
            success: true,
            message: "Wishlist cleared",
            wishlist,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
