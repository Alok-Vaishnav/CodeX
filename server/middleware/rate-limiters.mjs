import rateLimit from "express-rate-limit";

const createLimiter = (windowMs, limit) => rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false });

export const authLimiter = createLimiter(15 * 60 * 1000, 30);
export const signupLimiter = createLimiter(60 * 60 * 1000, 8);
export const loginLimiter = createLimiter(15 * 60 * 1000, 10);
export const otpLimiter = createLimiter(15 * 60 * 1000, 8);
export const questionLimiter = createLimiter(60 * 60 * 1000, 30);
