require("dotenv").config();
const jwt = require("jsonwebtoken");

const token = jwt.sign(
  { id: 1, email: "test@example.com", role: "student" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" },
);

console.log(token);
