import express from "express";
import { adminOnly, protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/profile", protect, (req,res)=>{
    res.status(200).json({
        success : true,
        user : req.user,
    })
})

router.get("/admin", protect, adminOnly, (req,res)=>{
    res.status(200).json({
        success : true,
        message : "Welcome Admin"
    })
})

export default router;