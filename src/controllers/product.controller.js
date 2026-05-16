import Product from "../models/product.model.js"

// create product 
export const createProduct = async (req, res) => {
    try {
        const { title, description, price, stock, images, category } = req.body;

        if (!title || !description || !price || !stock || !category) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided"
            })
        }

        const existing = await Product.findOne({ title, category });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Product already exists"
            });
        }

        const product = await Product.create({
            title,
            description,
            price,
            stock, images, category,
            createdBy: req.user._id,
        })

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

// get all products 
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


// get single product 
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


// update product 
export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product: updatedProduct,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// delete product 
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
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