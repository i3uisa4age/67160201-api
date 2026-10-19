let students = [
  {
    id: 1,
    name: "สมชาย ใจดี",
    major: "วิทยาการคอมพิวเตอร์",
    email: "somchai@example.com",
    phone: "080-000-0001",
    courseIds: [101, 102],
  },
  {
    id: 2,
    name: "สมหญิง รักเรียน",
    major: "เทคโนโลยีสารสนเทศ",
    email: "somying@example.com",
    phone: "080-000-0002",
    courseIds: [102],
  },
];

let courses = [
  { id: 101, courseName: "การเขียนโปรแกรมเบื้องต้น", credit: 3 },
  { id: 102, courseName: "โครงสร้างข้อมูล", credit: 3 },
];

let nextStudentId = 3;

// Helper function แปลงข้อมูลให้ตรงตาม Schema
function resolveStudent(student) {
  const safeCourseIds = student.courseIds || [];

  return {
    ...student,
    id: String(student.id), // แปลงเป็น String ตาม ID! ของ GraphQL
    courses: courses
      .filter((c) => safeCourseIds.map(Number).includes(c.id))
      .map((c) => ({ ...c, id: String(c.id) })), // แปลง id รายวิชาเป็น String ด้วย
  };
}

const root = {
  // ----- Read -----
  student: ({ id }) => {
    const student = students.find((s) => s.id === Number(id));
    return student ? resolveStudent(student) : null;
  },

  students: ({ major, sortBy }) => {
    let result = students;

    if (major) {
      result = result.filter((s) => s.major === major);
    }

    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result.map(resolveStudent);
  },

  studentCount: () => students.length,

  course: ({ id }) => {
    const course = courses.find((c) => c.id === Number(id));
    return course ? { ...course, id: String(course.id) } : null;
  },

  courses: ({ minCredit }) => {
    let result = courses;
    if (minCredit !== undefined && minCredit !== null) {
      result = courses.filter((c) => c.credit >= minCredit);
    }
    return result.map((c) => ({ ...c, id: String(c.id) }));
  },

  searchStudents: ({ keyword }) => {
    const lowerKeyword = keyword.toLowerCase();
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(lowerKeyword) ||
          s.major.toLowerCase().includes(lowerKeyword),
      )
      .map(resolveStudent);
  },

  // ----- Create -----
  createStudent: ({ input }) => {
    const newStudent = {
      id: nextStudentId++,
      name: input.name,
      major: input.major,
      email: input.email,
      phone: input.phone,
      courseIds: (input.courseIds || []).map(Number),
    };
    students.push(newStudent);
    return resolveStudent(newStudent);
  },

  // ----- Update -----
  updateStudent: ({ id, input }) => {
    const student = students.find((s) => s.id === Number(id));

    if (!student) {
      return null;
    }

    if (input.name !== undefined) student.name = input.name;
    if (input.major !== undefined) student.major = input.major;
    if (input.email !== undefined) student.email = input.email;
    if (input.phone !== undefined) student.phone = input.phone;
    if (input.courseIds !== undefined) {
      student.courseIds = input.courseIds.map(Number);
    }

    return resolveStudent(student);
  },

  // ----- Delete -----
  deleteStudent: ({ id }) => {
    const index = students.findIndex((s) => s.id === Number(id));

    if (index === -1) {
      return { success: false, message: "ไม่พบข้อมูลนักศึกษาที่ต้องการลบ" };
    }

    students.splice(index, 1);
    return { success: true, message: "ลบข้อมูลนักศึกษาสำเร็จ" };
  },
};

module.exports = root;
