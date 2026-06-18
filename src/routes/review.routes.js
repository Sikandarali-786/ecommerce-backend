import express from "express";
import {
    getProductReviews,
    upsertReview,
    deleteReview,
} from "../controllers/review.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router({ mergeParams: true }); // inherits :productId from parent

router.get("/",                          getProductReviews);   // public
router.post("/",    protect,             upsertReview);        // logged-in users
router.delete("/:reviewId", protect,     deleteReview);        // owner or admin

export default router;
