import Product from "../models/product.model.js";
import { deleteImage } from "../utils/upload.js";

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Helper: build image path from uploaded file
const getImagePath = (file) => {
    if (IS_PRODUCTION) {
        // Cloudinary returns the full URL in file.path — store as-is
        return file.path;
    }
    // Local dev: store only the relative path, NOT the full URL
    return `/uploads/products/${file.filename}`;
};

// ─── CREATE PRODUCT ───────────────────────────────────────────────────────────
export const createProduct = async (req, res) => {
    try {
        const { title, description, price, stock, category } = req.body;

        if (!title || !description || !price || !stock || !category) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided",
            });
        }

        const existing = await Product.findOne({ title, category });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Product already exists",
            });
        }

        // Build images array from uploaded files
        const images = req.files?.length
            ? req.files.map((file) => getImagePath(file))
            : [];

        const product = await Product.create({
            title,
            description,
            price: Number(price),
            stock: Number(stock),
            images,
            category,
            createdBy: req.user._id,
        });

        await product.populate("category", "name slug");

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ─── GET ALL PRODUCTS ─────────────────────────────────────────────────────────
export const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate("category", "name slug")
            .populate("createdBy", "name email");

        res.status(200).json({
            success: true,
            products,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ─── GET SINGLE PRODUCT ───────────────────────────────────────────────────────
export const getSingleProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate("category", "name slug")
            .populate("createdBy", "name email");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        res.status(200).json({
            success: true,
            product,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ─── UPDATE PRODUCT ───────────────────────────────────────────────────────────
export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const { title, description, price, stock, category, removeImages } = req.body;

        // Handle image removal (array of URLs to delete)
        if (removeImages) {
            const toRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
            for (const url of toRemove) {
                await deleteImage(url);
            }
            product.images = product.images.filter((img) => !toRemove.includes(img));
        }

        // Add newly uploaded images
        if (req.files?.length) {
            const newImages = req.files.map((file) => getImagePath(file));
            product.images = [...product.images, ...newImages];
        }

        // Update other fields
        if (title !== undefined) product.title = title;
        if (description !== undefined) product.description = description;
        if (price !== undefined) product.price = Number(price);
        if (stock !== undefined) product.stock = Number(stock);
        if (category !== undefined) product.category = category;

        await product.save();
        await product.populate("category", "name slug");

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ─── DELETE PRODUCT ───────────────────────────────────────────────────────────
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Delete all associated images
        for (const imageUrl of product.images) {
            await deleteImage(imageUrl);
        }

        await Product.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
