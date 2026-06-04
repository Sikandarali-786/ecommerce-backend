import express from "express";
import { adminOnly, protect } from "../middleware/auth.middleware.js";
import {
    getAllUsers,
    getUserById,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    getDashboardStats,
} from "../controllers/user.controller.js";
import { updateProfile, changePassword } from "../controllers/auth.controller.js";

const router = express.Router();

// ── User profile routes ──────────────────────────────────────────────────────
router.get("/profile", protect, (req, res) => {
    res.status(200).json({ success: true, user: req.user });
});

router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

// ── Admin access check ───────────────────────────────────────────────────────
router.get("/admin", protect, adminOnly, (req, res) => {
    res.status(200).json({ success: true, message: "Welcome Admin" });
});

router.get("/admin/stats", protect, adminOnly, getDashboardStats);
router.get("/admin/users", protect, adminOnly, getAllUsers);
router.get("/admin/users/:id", protect, adminOnly, getUserById);
router.put("/admin/users/:id/role", protect, adminOnly, updateUserRole);
router.put("/admin/users/:id/toggle-status", protect, adminOnly, toggleUserStatus);
router.delete("/admin/users/:id", protect, adminOnly, deleteUser);

export default router;