const express = require("express");
const router = express.Router();

let courses = [
  { id: 101, courseName: "การเขียนโปรแกรมเบื้องต้น", credit: 3 },
  { id: 102, courseName: "โครงสร้างข้อมูล", credit: 3 },
];

let nextId = 103;

// 1. GET: ดึงรายการรายวิชาทั้งหมด
router.get("/api/v1/courses", (req, res) => {
  res.status(200).json({ message: "สำเร็จ", data: courses });
});

// 2. GET: ดึงข้อมูลรายวิชารายบุคคลตาม id
router.get("/api/v1/courses/:id", (req, res) => {
  const id = Number(req.params.id);
  const course = courses.find((c) => c.id === id);

  if (!course) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลรายวิชา" },
    });
  }

  res.status(200).json({ message: "สำเร็จ", data: course });
});

// 3. POST: เพิ่มข้อมูลรายวิชาใหม่
router.post("/api/v1/courses", (req, res) => {
  const { courseName, credit } = req.body;

  if (!courseName || credit === undefined) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุ courseName และ credit ให้ครบถ้วน",
      },
    });
  }

  const duplicated = courses.find((c) => c.courseName === courseName);
  if (duplicated) {
    return res.status(409).json({
      error: {
        code: "DUPLICATED_ERROR",
        message: "courseName นี้มีอยู่ในระบบแล้ว",
      },
    });
  }

  const newCourse = { id: nextId++, courseName, credit: Number(credit) };
  courses.push(newCourse);

  res.status(201).json({ message: "เพิ่มข้อมูลสำเร็จ", data: newCourse });
});

// 4. PUT: แก้ไขข้อมูลรายวิชาทั้งระเบียน
router.put("/api/v1/courses/:id", (req, res) => {
  const id = Number(req.params.id);
  const { courseName, credit } = req.body;
  const course = courses.find((c) => c.id === id);

  if (!course) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลรายวิชา" },
    });
  }

  if (!courseName || credit === undefined) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุ courseName และ credit ให้ครบถ้วน",
      },
    });
  }

  course.courseName = courseName;
  course.credit = Number(credit);

  res.status(200).json({ message: "แก้ไขข้อมูลสำเร็จ", data: course });
});

// 5. PATCH: สำหรับการแก้ไขข้อมูลบางส่วน
router.patch("/api/v1/courses/:id", (req, res) => {
  const id = Number(req.params.id);
  const course = courses.find((c) => c.id === id);

  if (!course) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลรายวิชา" },
    });
  }

  const { courseName, credit } = req.body;

  if (courseName !== undefined) course.courseName = courseName;
  if (credit !== undefined) course.credit = Number(credit);

  res.status(200).json({ message: "แก้ไขข้อมูลสำเร็จ", data: course });
});

// 6. DELETE: ลบข้อมูลรายวิชา
router.delete("/api/v1/courses/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = courses.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลรายวิชา" },
    });
  }

  courses.splice(index, 1);

  res.status(200).json({ message: "ลบข้อมูลสำเร็จ" });
});

// 🛠️ สิ่งสำคัญ: ต้อง export router ออกไปใช้งาน
module.exports = router;
