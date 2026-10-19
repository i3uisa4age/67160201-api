const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const swaggerUi = require("swagger-ui-express");
const YAML = require("js-yaml");
const { graphqlHTTP } = require("express-graphql");

// Import Rate Limiters
const { authLimiter, generalLimiter } = require("./middlewares/rateLimiter");

// Import Routes
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const courseRoutes = require("./routes/courses");

// Import GraphQL Schemas & Resolvers
const schema = require("./schema");
const root = require("./resolvers");

const app = express();

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));

// Rate Limiter Config
app.set("trust proxy", 1);
app.use(generalLimiter);

// Swagger OpenAPI Documentation Setup
const openapiDocument = YAML.load(
  fs.readFileSync(path.join(__dirname, "openapi.yaml"), "utf8"),
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

// GraphQL
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  }),
);

// Register REST API Routes (ใส่ authLimiter เฉพาะเส้นทาง login ก่อน mount authRoutes)
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/students", studentRoutes);
app.use(courseRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: { code: "ROUTE_NOT_FOUND", message: "ไม่พบเส้นทางที่ร้องขอ" },
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      code: statusCode === 500 ? "INTERNAL_SERVER_ERROR" : err.type || "ERROR",
      message:
        statusCode === 500
          ? "เกิดข้อผิดพลาดที่ไม่คาดคิดภายในระบบ"
          : err.message,
    },
  });
});

module.exports = app;
