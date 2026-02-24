import rateLimit from "express-rate-limit";

/**
 * Rate limiter for authentication endpoints (login, register).
 * Prevents brute-force attacks by limiting repeated requests from a single IP.
 *
 * - Window: 15 minutes
 * - Max requests per window: 15 (login) or 10 (register)
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,                   // 15 attempts per window
    message: { message: "Too many login attempts. Please try again after 15 minutes." },
    standardHeaders: true,     // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,      // Disable X-RateLimit-* headers
});

export const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 attempts per window
    message: { message: "Too many registration attempts. Please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limiter — applied globally to all routes.
 * Prevents a single IP from overwhelming the server.
 *
 * - Window: 1 minute
 * - Max requests per window: 100
 */
export const globalLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 100,
    message: { message: "Too many requests. Please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
});
