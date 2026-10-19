const request = require("supertest");
const app = require("./app");
const { generateToken } = require("./auth-helpers");

describe("Auth & RBAC Middleware Coverage Tests", () => {
  test("ควรคืน 401 เมื่อ Token ถูกแก้ไขตัวอักษรบางส่วน (INVALID_TOKEN)", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid.token.structure");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_TOKEN");
  });

  test("ควรคืน 403 เมื่อผู้ใช้ที่มี role เป็น student พยายามลบข้อมูลนิสิต", async () => {
    const studentToken = generateToken({
      id: 99,
      email: "student@test.com",
      role: "student",
    });

    const response = await request(app)
      .delete("/api/v1/students/1")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });
});
