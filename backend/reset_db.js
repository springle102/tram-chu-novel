require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function resetDatabase() {
  console.log("[DB-RESET] Connecting to database...");
  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "Violet_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "123456",
  });

  try {
    const sqlPath = path.join(__dirname, "init.sql");
    console.log(`[DB-RESET] Reading SQL initialization file: ${sqlPath}`);
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    console.log("[DB-RESET] Executing SQL script...");
    await pool.query(sqlContent);
    console.log("[DB-RESET] ✓ Database reset successfully!");
  } catch (err) {
    console.error("[DB-RESET] ❌ Error resetting database:", err);
  } finally {
    await pool.end();
  }
}

resetDatabase();
