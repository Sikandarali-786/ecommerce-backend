import express from "express";
import {
  loginUser,
  registerUser,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register",              registerLimiter,       registerUser);
router.post("/login",                 loginLimiter,          loginUser);
router.post("/forgot-password",       forgotPasswordLimiter, forgotPassword);
router.post("/reset-password/:token", resetPasswordLimiter,  resetPassword);

export default router;
