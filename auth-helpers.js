const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// กำหนด Secret fallback ให้ตรงกันทุกจุด
const JWT_SECRET = process.env.JWT_SECRET || "default_test_secret_key_123456";

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function verifyPassword(password, hashed) {
  return await bcrypt.compare(password, hashed);
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "1h" },
  );
}

// ✅ ส่งออกฟังก์ชันรวมกันเป็น Object
module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
};
