require("dotenv").config();

module.exports = {
  development: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3307,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "0000",
      database: process.env.DB_NAME || "student_api",
      charset: "utf8mb4",
    },
    migrations: {
      directory: "./migrations",
    },
  },
};
