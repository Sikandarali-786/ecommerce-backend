import Product from "../models/product.model.js";
import { deleteImage } from "../utils/upload.js";
import {
    sendAdminLowStockEmail,
} from "../utils/email.js";

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD) || 5;

// Helper: build image path from uploaded file
const getImagePath = (file) => {
    if (!file) return '';
    if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
        return file.path;
    }
    return `/uploads/products/${file.filename}`;
};

// ─── CREATE PRODUCT ───────────────────────────────────────────────────────────
export const createProduct = async (req, res) => {
    try {
        const { title, description, price, stock, category, weight } = req.body;

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
            weight: typeof weight !== 'undefined' ? Number(weight) : 1,
            images,
            category,
            createdBy: req.user._id,
        });

        await product.populate("category", "name slug");

        if (product.stock <= LOW_STOCK_THRESHOLD) {
            sendAdminLowStockEmail(product, product.stock).catch(() => {});
        }

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
        const {
            search,
            category,
            minPrice,
            maxPrice,
            sortBy,
            page  = 1,
            limit = 20,
        } = req.query;

        // ── Build query ──────────────────────────────────────────────────────
        const query = {};

        // Full-text search on title + description (case-insensitive)
        if (search?.trim()) {
            query.$or = [
                { title:       { $regex: search.trim(), $options: 'i' } },
                { description: { $regex: search.trim(), $options: 'i' } },
            ];
        }

        // Category filter — accepts category _id
        if (category?.trim()) {
            query.category = category.trim();
        }

        // Price range
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // ── Sort ─────────────────────────────────────────────────────────────
        const sortMap = {
            'price-asc':  { price:  1 },
            'price-desc': { price: -1 },
            'name-asc':   { title:  1 },
            'name-desc':  { title: -1 },
            'newest':     { createdAt: -1 },
        };
        const sort = sortMap[sortBy] ?? { createdAt: -1 };

        // ── Pagination ────────────────────────────────────────────────────────
        const pageNum  = Math.max(1, parseInt(page,  10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip     = (pageNum - 1) * limitNum;

        // ── Execute ───────────────────────────────────────────────────────────
        const [products, total] = await Promise.all([
            Product.find(query)
                .populate('category', 'name slug')
                .populate('createdBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(limitNum),
            Product.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            products,
            pagination: {
                total,
                page:       pageNum,
                limit:      limitNum,
                totalPages: Math.ceil(total / limitNum),
                hasMore:    pageNum < Math.ceil(total / limitNum),
            },
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

        const previousStock = product.stock;
        const { title, description, price, stock, category, weight, removeImages } = req.body;

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
        if (weight !== undefined) product.weight = Number(weight);
        if (category !== undefined) product.category = category;

        await product.save();
        await product.populate("category", "name slug");

        if (
            typeof stock !== "undefined" &&
            Number(stock) <= LOW_STOCK_THRESHOLD &&
            previousStock > LOW_STOCK_THRESHOLD
        ) {
            sendAdminLowStockEmail(product, product.stock).catch(() => {});
        }

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
