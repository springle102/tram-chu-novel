require("dotenv").config();
const db = require("./src/config/db");

console.log("=== NEON DB CONNECTION DIAGNOSTIC START ===");
console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":******@");
  console.log("Using URL:", maskedUrl);
}

db.testConnection()
  .then((serverTime) => {
    console.log("✓ Connection test SUCCESS!");
    console.log("Server Time:", serverTime);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Connection test FAILED!");
    console.error("Error message:", err.message);
    console.error("Error details:", err);
    process.exit(1);
  });
