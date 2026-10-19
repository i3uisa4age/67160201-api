// middlewares/rateLimiter.js
const rateLimit = require("express-rate-limit");

// จำกัดการเข้าสู่ระบบไม่เกิน 5 ครั้ง / 15 นาที (และอนุญาตจำนวนมากขณะรัน Jest Test)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "พยายามเข้าสู่ระบบเกินจำนวนที่กำหนด กรุณาลองใหม่ภายหลัง",
    },
  },
});

// จำกัด Request ทั่วไป 100 ครั้ง / 1 นาที
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter };
