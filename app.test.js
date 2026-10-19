jest.mock("./db");
jest.mock("./cache", () => ({
  connectRedis: jest.fn().mockResolvedValue(),
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(),
  clearCache: jest.fn().mockResolvedValue(),
  redisClient: { del: jest.fn().mockResolvedValue() },
}));

const pool = require("./db");
const request = require("supertest");
const app = require("./app");
const { generateToken } = require("./auth-helpers");

describe("app.js - Root App & Centralized Error Handler Coverage", () => {
  let token;

  beforeAll(() => {
    token = generateToken({ id: 1, email: "admin@test.com", role: "admin" });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 1. ทดสอบ 404 Handler
  test("GET /api/v1/unknown-route - ควรคืนค่า 404 เมื่อเรียก Route ที่ไม่มีอยู่จริง", async () => {
    const response = await request(app).get("/api/v1/unknown-route");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(response.body.error.message).toBe("ไม่พบเส้นทางที่ร้องขอ");
  });

  // 2. ทดสอบ Error Handler กรณีที่มี err.status และ err.type
  test("ควรจัดการ Error ที่ระบุ err.status และ err.type ได้ถูกต้อง", async () => {
    const customErr = new Error("ข้อมูลไม่ถูกต้อง");
    customErr.status = 400;
    customErr.type = "BAD_REQUEST_ERROR";
    pool.query.mockRejectedValueOnce(customErr);

    const response = await request(app)
      .get("/api/v1/students/1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_REQUEST_ERROR");
    expect(response.body.error.message).toBe("ข้อมูลไม่ถูกต้อง");
  });

  // 3. ทดสอบ Error Handler กรณีที่มี err.statusCode แต่ไม่มี err.type (ทดสอบ Branch err.type || 'ERROR')
  test("ควรจัดการ Error ที่ระบุ err.statusCode และใช้ default code 'ERROR'", async () => {
    const customErr = new Error("Unprocessable Entity");
    customErr.statusCode = 422;
    pool.query.mockRejectedValueOnce(customErr);

    const response = await request(app)
      .get("/api/v1/students/1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("ERROR");
    expect(response.body.error.message).toBe("Unprocessable Entity");
  });

  // 4. ทดสอบ Error Handler กรณีเกิด Error 500 (Internal Server Error)
  test("ควรจัดการ Error 500 พร้อมคืนค่าข้อความระบบขัดข้องมาตรฐาน", async () => {
    pool.query.mockRejectedValueOnce(new Error("Database Crash"));

    const response = await request(app)
      .get("/api/v1/students/1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(response.body.error.message).toBe(
      "เกิดข้อผิดพลาดที่ไม่คาดคิดภายในระบบ",
    );
  });
});
