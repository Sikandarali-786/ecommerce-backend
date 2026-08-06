import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from "morgan";
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/user.routes.js"
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js"
import cartRoutes from "./routes/cart.routes.js"
import wishlistRoutes from "./routes/wishlist.routes.js"
import orderRoutes from "./routes/order.routes.js"
import reviewRoutes from "./routes/review.routes.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Serve uploaded images as static files (local development)
// __dirname = backend/src, so go up one level to backend/
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/categories", categoryRoutes);
app.use("/api/product", productRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/wishlist", wishlistRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/product/:productId/reviews", reviewRoutes)

app.get('/', (req, res) => {
    res.send("Backend Running....")
})

// Global error handler — catches anything passed to next(err)
app.use((err, req, res, next) => {
    console.error("=== GLOBAL ERROR ===");
    console.error(err.stack || err);
    res.status(500).json({ success: false, message: err.message });
});

export default app;