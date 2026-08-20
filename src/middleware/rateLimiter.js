import rateLimit from "express-rate-limit";

// ── Shared response formatter ─────────────────────────────────────────────────
const handler = (req, res) => {
    res.status(429).json({
        success: false,
        message: "Too many attempts. Please try again later.",
    });
};

// ── Login: 10 attempts per 15 minutes per email ───────────────────────────────
export const loginLimiter = rateLimit({
    windowMs:         15 * 60 * 1000, // 15 minutes
    max:              10,
    keyGenerator: (req) => {
        const email = req.body?.email;
        if (typeof email === "string" && email.trim()) {
            return email.trim().toLowerCase();
        }

        return req.ip;
    },
    standardHeaders:  true,            // Return rate limit info in RateLimit-* headers
    legacyHeaders:    false,
    handler,
    message: "Too many login attempts. Please wait 15 minutes before trying again.",
    skipSuccessfulRequests: true,      // successful logins don't count toward the limit
});

// ── Register: 50 accounts per 15 minutes per IP ──────────────────────────────
export const registerLimiter = rateLimit({
    windowMs:         15 * 60 * 1000, // 15 minutes
    max:              50,
    standardHeaders:  true,
    legacyHeaders:    false,
    handler,
    message: "Too many accounts created from this IP. Please try again after 15 minutes.",
});

// ── Forgot password: 5 requests per 15 minutes per IP ────────────────────────
// Prevents email flooding / user enumeration abuse
export const forgotPasswordLimiter = rateLimit({
    windowMs:         15 * 60 * 1000, // 15 minutes
    max:              5,
    standardHeaders:  true,
    legacyHeaders:    false,
    handler,
    message: "Too many password reset requests. Please wait 15 minutes.",
});

// ── Reset password: 5 attempts per 15 minutes per IP ─────────────────────────
export const resetPasswordLimiter = rateLimit({
    windowMs:         15 * 60 * 1000, // 15 minutes
    max:              5,
    standardHeaders:  true,
    legacyHeaders:    false,
    handler,
    message: "Too many password reset attempts. Please wait 15 minutes.",
});
