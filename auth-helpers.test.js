// ✅ เพิ่มบรรทัดนำเข้าเหล่านี้ไว้ด้านบนสุดของไฟล์
const {
  hashPassword,
  verifyPassword,
  generateToken,
} = require("./auth-helpers");
const jwt = require("jsonwebtoken");

describe("generateToken", () => {
  test("ควรสร้าง token ที่มี payload ตรงกับข้อมูลผู้ใช้", () => {
    const user = { id: 1, email: "test@example.com", role: "student" };
    const token = generateToken(user);
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_test_secret_key_123456",
    );

    expect(decoded.id).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.role).toBe(user.role);
  });
});
