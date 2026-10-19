const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth");
const { redisClient } = require("../cache");
const { parsePagination, parseSort } = require("../middlewares/query-parser");
const { getStudentEnrichment } = require("../services/enrichment-service");
const { createStudentSchema } = require("../schemas/studentSchema");

// GET /api/v1/students
router.get(
  "/",
  authenticateToken,
  parsePagination,
  parseSort,
  async (req, res, next) => {
    const { major } = req.query;
    const { page, limit, offset } = req.pagination;
    const { field, order } = req.sort;

    let baseQuery = "SELECT * FROM students";
    let countQuery = "SELECT COUNT(*) AS total FROM students";
    const params = [];

    if (major) {
      baseQuery += " WHERE major = ?";
      countQuery += " WHERE major = ?";
      params.push(major);
    }

    baseQuery += ` ORDER BY ${field} ${order} LIMIT ? OFFSET ?`;

    try {
      const [rows] = await pool.query(baseQuery, [...params, limit, offset]);
      const [countRows] = await pool.query(countQuery, params);
      const total = countRows[0].total;

      res.status(200).json({
        message: "สำเร็จ",
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/students/:id
router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM students WHERE id = ?", [
      req.params.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลนิสิต" },
      });
    }

    res.status(200).json({ message: "สำเร็จ", data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// สัปดาห์ที่ 11: ข้อมูลเสริมจาก Public API ภายนอก พร้อม Retry/Timeout/Fallback
router.get("/:id/enrichment", authenticateToken, async (req, res, next) => {
  try {
    const enrichment = await getStudentEnrichment(req.params.id);

    return res.status(200).json({
      data: {
        studentId: req.params.id,
        enrichment,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/students (นำ createStudentLimiter ออกเรียบร้อย)
router.post("/", async (req, res, next) => {
  // ตรวจสอบข้อมูลด้วย Zod Schema
  const result = createStudentSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
        details: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  const { name, major, email } = result.data;

  try {
    const [insertResult] = await pool.query(
      "INSERT INTO students (name, major, email) VALUES (?, ?, ?)",
      [name, major, email],
    );

    try {
      await redisClient.del("students:all");
    } catch (cacheErr) {
      console.error("Redis Error:", cacheErr);
    }

    res.status(201).json({
      message: "เพิ่มข้อมูลสำเร็จ",
      data: { id: insertResult.insertId, name, major, email },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_EMAIL",
          message: "อีเมลนี้มีอยู่ในระบบแล้ว",
        },
      });
    }
    next(err);
  }
});

// DELETE /api/v1/students/:id
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res, next) => {
    try {
      const [result] = await pool.query("DELETE FROM students WHERE id = ?", [
        req.params.id,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลนิสิต" },
        });
      }

      try {
        await redisClient.del("students:all");
      } catch (cacheErr) {
        console.error("Redis Error:", cacheErr);
      }

      res.status(200).json({ message: "ลบข้อมูลสำเร็จ" });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/students/:id/enrollments
router.post("/:id/enrollments", authenticateToken, async (req, res, next) => {
  const studentId = req.params.id;
  const { courseId } = req.body;

  if (!courseId) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "กรุณาระบุ courseId" },
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [courseRows] = await connection.query(
      "SELECT * FROM courses WHERE id = ? FOR UPDATE",
      [courseId],
    );

    if (courseRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: { code: "COURSE_NOT_FOUND", message: "ไม่พบรายวิชาที่ระบุ" },
      });
    }

    if (courseRows[0].seat_available <= 0) {
      await connection.rollback();
      return res.status(409).json({
        error: { code: "SEAT_FULL", message: "ที่นั่งเต็มแล้ว" },
      });
    }

    await connection.query(
      "INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)",
      [studentId, courseId],
    );

    await connection.query(
      "UPDATE courses SET seat_available = seat_available - 1 WHERE id = ?",
      [courseId],
    );

    await connection.commit();
    res.status(201).json({ message: "ลงทะเบียนสำเร็จ" });
  } catch (err) {
    if (connection) await connection.rollback();

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: {
          code: "ALREADY_ENROLLED",
          message: "นิสิตลงทะเบียนรายวิชานี้ไปแล้ว",
        },
      });
    }
    next(err);
  } finally {
    if (connection) connection.release();
  }
});

// PUT /api/v1/students/:id
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res, next) => {
    const { name, major, email } = req.body;

    if (!name || !major || !email) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "กรุณาระบุข้อมูลให้ครบถ้วน",
        },
      });
    }

    try {
      const [result] = await pool.query(
        "UPDATE students SET name = ?, major = ?, email = ? WHERE id = ?",
        [name, major, email, req.params.id],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลนิสิต" },
        });
      }

      try {
        await redisClient.del("students:all");
      } catch (cacheErr) {
        console.error("Redis Error:", cacheErr);
      }

      res.status(200).json({
        message: "แก้ไขข้อมูลสำเร็จ",
        data: { id: req.params.id, name, major, email },
      });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          error: {
            code: "DUPLICATE_EMAIL",
            message: "อีเมลนี้มีอยู่ในระบบแล้ว",
          },
        });
      }
      next(err);
    }
  },
);

module.exports = router;
