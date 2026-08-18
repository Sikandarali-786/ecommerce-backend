import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import { deleteImage } from "../utils/upload.js";

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const getImagePath = (file) => {
    if (!file) return '';
    if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
        return file.path;
    }
    return `/uploads/products/${file.filename}`;
};

export const createCategory = async (req, res) => {
    try {
        const { name, slug } = req.body;
        const image = req.file ? getImagePath(req.file) : '';

        if (!name || !slug) {
            return res.status(400).json({
                success: false,
                message: "Name and slug are required",
            });
        }

        const existingCategory = await Category.findOne({
            $or: [{ name }, { slug }],
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Category already exists",
            });
        }

        const category = await Category.create({
            name,
            slug,
            image,
        });

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            category,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// get all categories
export const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            categories,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// update category (admin only)
export const updateCategory = async (req, res) => {
    try {
        const { name, slug, image } = req.body;

        if (!name || !slug) {
            return res.status(400).json({
                success: false,
                message: "Name and slug are required",
            });
        }

        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        const duplicate = await Category.findOne({
            _id: { $ne: req.params.id },
            $or: [{ name }, { slug }],
        });

        if (duplicate) {
            return res.status(400).json({
                success: false,
                message: "Category with this name or slug already exists",
            });
        }

        category.name = name;
        category.slug = slug;

        if (req.file) {
            await deleteImage(category.image);
            category.image = getImagePath(req.file);
        }

        await category.save();

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            category,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// delete category (admin only)
export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        const productCount = await Product.countDocuments({ category: req.params.id });

        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. ${productCount} product(s) are using it.`,
            });
        }

        await Category.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};