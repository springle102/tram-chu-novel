// ============================================================
// Trạm Chữ Novel — Database Reset and Initialization Utility
// ============================================================
// Đọc file init.sql và thực thi để khởi tạo lại toàn bộ cấu trúc bảng
// và nạp dữ liệu mẫu ban đầu (seeding).
// Hoạt động tốt trên cả Local DB và Neon Cloud DB.
// ============================================================

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("./src/config/db");

async function resetDatabase() {
  console.log("=== BẮT ĐẦU RESET & KHỞI TẠO DATABASE ===");
  console.log("Database target:", process.env.DB_NAME || "Violet_db");
  if (process.env.DATABASE_URL) {
    const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":******@");
    console.log("Database URL:", maskedUrl);
  }

  // 1. Đọc file init.sql
  const sqlPath = path.join(__dirname, "init.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error("❌ Không tìm thấy file init.sql tại:", sqlPath);
    process.exit(1);
  }

  console.log("✓ Đang đọc file init.sql...");
  const sqlContent = fs.readFileSync(sqlPath, "utf8");

  // 2. Thực thi toàn bộ lệnh SQL
  console.log("⌛ Đang thực thi các câu lệnh SQL khởi tạo (việc này có thể mất vài giây)...");
  
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    
    // Thực thi toàn bộ nội dung SQL
    await client.query(sqlContent);
    
    await client.query("COMMIT");
    console.log("✓ Khởi tạo cấu trúc bảng và seeding dữ liệu thành công!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Lỗi khi thực thi SQL:");
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }

  console.log("=== HOÀN TẤT RESET DATABASE ===");
}

resetDatabase();
