import Review from "../models/review.model.js";
import Order from "../models/order.model.js";

// ─── GET ALL REVIEWS FOR A PRODUCT ───────────────────────────────────────────
export const getProductReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ product: req.params.productId })
            .populate("user", "name")
            .sort({ createdAt: -1 });

        // Average rating
        const avg = reviews.length
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        res.status(200).json({
            success: true,
            reviews,
            totalReviews: reviews.length,
            averageRating: parseFloat(avg.toFixed(1)),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CREATE OR UPDATE A REVIEW ────────────────────────────────────────────────
export const upsertReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const productId = req.params.productId;
        const userId    = req.user._id;

        if (!rating || !comment) {
            return res.status(400).json({
                success: false,
                message: "Rating and comment are required",
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5",
            });
        }

        // Verify user has purchased this product
        const hasPurchased = await Order.findOne({
            user:          userId,
            orderStatus:   { $in: ["Delivered", "Confirmed", "Shipped", "Processing"] },
            "items.product": productId,
        });

        if (!hasPurchased) {
            return res.status(403).json({
                success: false,
                message: "You can only review products you have ordered",
            });
        }

        // Upsert — update if exists, create if not
        const review = await Review.findOneAndUpdate(
            { product: productId, user: userId },
            { rating: Number(rating), comment: comment.trim() },
            { new: true, upsert: true, runValidators: true },
        ).populate("user", "name");

        res.status(200).json({
            success: true,
            message: "Review saved successfully",
            review,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── DELETE OWN REVIEW ────────────────────────────────────────────────────────
export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findOne({
            _id:     req.params.reviewId,
            product: req.params.productId,
        });

        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        // Owner or admin can delete
        if (
            review.user.toString() !== req.user._id.toString() &&
            req.user.role !== "admin"
        ) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        await review.deleteOne();

        res.status(200).json({ success: true, message: "Review deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
