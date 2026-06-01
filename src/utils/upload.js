import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ─── CLOUDINARY CONFIG ────────────────────────────────────────────────────────
if (IS_PRODUCTION) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

// ─── FILE FILTER (images only) ────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
};

// ─── LOCAL STORAGE (development) ─────────────────────────────────────────────
const localStorageEngine = () => {
    const uploadDir = 'uploads/products';

    // Create uploads folder if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `product-${uniqueSuffix}${ext}`);
        },
    });
};

// ─── CLOUDINARY STORAGE (production) ─────────────────────────────────────────
const cloudinaryStorageEngine = () => {
    return new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'ecommerce/products',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
        },
    });
};

// ─── EXPORT MULTER INSTANCE ───────────────────────────────────────────────────
const storage = IS_PRODUCTION ? cloudinaryStorageEngine() : localStorageEngine();

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ─── DELETE IMAGE HELPER ──────────────────────────────────────────────────────
export const deleteImage = async (imagePath) => {
    try {
        if (IS_PRODUCTION) {
            // Production: imagePath is a full Cloudinary URL
            // Extract public_id: e.g. ecommerce/products/abc
            const parts = imagePath.split('/');
            const filename = parts[parts.length - 1].split('.')[0];
            const folder = parts[parts.length - 2];
            const publicId = `${folder}/${filename}`;
            await cloudinary.uploader.destroy(publicId);
        } else {
            // Development: imagePath is like /uploads/products/filename.jpg
            // Resolve relative to the backend root (one level up from src/)
            const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
            const absolutePath = path.join(path.resolve(), relativePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }
    } catch (error) {
        console.error('Error deleting image:', error.message);
    }
};
