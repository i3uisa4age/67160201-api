jest.mock("./db");
jest.mock("./cache", () => ({
  connectRedis: jest.fn().mockResolvedValue(),
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(),
  clearCache: jest.fn().mockResolvedValue(),
  redisClient: {
    del: jest.fn().mockResolvedValue(),
  },
}));

const pool = require("./db");
const request = require("supertest");
const app = require("./app");
const { generateToken } = require("./auth-helpers");

describe("Students CRUD & Pagination Routes (mocked)", () => {
  let adminToken;
  let studentToken;

  beforeAll(() => {
    adminToken = generateToken({
      id: 1,
      email: "admin@test.com",
      role: "admin",
    });
    studentToken = generateToken({
      id: 2,
      email: "student@test.com",
      role: "student",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("GET /api/v1/students - ควรส่งคืนรายการนักเรียนพร้อมข้อมูล Pagination", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1, name: "Alice", major: "CS" }]])
      .mockResolvedValueOnce([[{ total: 12 }]]);

    const response = await request(app)
      .get("/api/v1/students?page=2&limit=5")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.limit).toBe(5);
    expect(response.body.pagination.totalPages).toBe(3);
  });

  test("POST /api/v1/students - Admin เพิ่มข้อมูลสำเร็จ ควรคืน 201", async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 10 }]);

    const response = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Bob", major: "SE", email: "bob@example.com" });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty("id", 10);
  });

  // 1. POST - กรณี Validation Error (400)
  test("POST /api/v1/students - คืน 400 เมื่อส่งข้อมูลไม่ครบถ้วน", async () => {
    const response = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Bob" }); // ขาด email และ major

    expect(response.status).toBe(400);
    expect(response.body.error).toHaveProperty("code", "VALIDATION_ERROR");
  });

  // 2. PUT - แก้ไขข้อมูลสำเร็จ (200)
  test("PUT /api/v1/students/:id - Admin แก้ไขข้อมูลสำเร็จ คืน 200", async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .put("/api/v1/students/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Alice Updated",
        major: "SE",
        email: "alice.u@example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Alice Updated");
  });

  // 3. PUT - ไม่พบ ID ในระบบ (404)
  test("PUT /api/v1/students/:id - คืน 404 เมื่อไม่พบ ID ในระบบ", async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const response = await request(app)
      .put("/api/v1/students/999")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Ghost", major: "CS", email: "ghost@example.com" });

    expect(response.status).toBe(404);
    expect(response.body.error).toHaveProperty("code", "NOT_FOUND");
  });

  // 4. DELETE - ลบข้อมูลสำเร็จ (200)
  test("DELETE /api/v1/students/:id - Admin ลบข้อมูลสำเร็จ คืน 200", async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .delete("/api/v1/students/1")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("สำเร็จ");
  });

  // 5. Mock Database Failure (500) - ตรงตามแบบฝึกหัดที่ 3
  test("GET /api/v1/students - คืน 500 เมื่อฐานข้อมูลขัดข้อง", async () => {
    pool.query.mockRejectedValueOnce(new Error("Database connection lost"));

    const response = await request(app)
      .get("/api/v1/students")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.status).toBe(500);
  });
});
