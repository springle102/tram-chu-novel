// ============================================================
// Trạm Chữ Novel — Database Connection (Connection Pool)
// ============================================================
// Sử dụng pg.Pool để quản lý connection pool, giúp chịu tải tốt hơn.
//
// ★ Hỗ trợ đọc DATABASE_URL (ưu tiên trên production) hoặc các biến rời.
// ============================================================

const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production" || !!process.env.DATABASE_URL;

// ── Khởi tạo cấu hình Connection Pool ──
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host:     process.env.DB_HOST     || "localhost",
      port:     parseInt(process.env.DB_PORT || "5432", 10),
      database: process.env.DB_NAME     || "Violet_db",
      user:     process.env.DB_USER     || "postgres",
      password: process.env.DB_PASSWORD || "",
    };

// Cấu hình giới hạn kết nối tối ưu cho Neon Free Tier (chỉ cho phép max 20 connections)
poolConfig.max = parseInt(process.env.DB_POOL_MAX || (isProduction ? "5" : "20"), 10);

// Thời gian chờ đóng connection idle
poolConfig.idleTimeoutMillis = 30000;

// Tăng connectionTimeoutMillis lên 15 giây để Neon DB kịp khởi động (Cold Start)
poolConfig.connectionTimeoutMillis = 15000;

// Bắt buộc sử dụng SSL khi kết nối tới Neon DB trên Production
if (isProduction) {
  poolConfig.ssl = {
    rejectUnauthorized: false, // Bắt buộc đối với Neon / cloud DB tự chứng thực
  };
}

const pool = new Pool(poolConfig);

// ── Event listeners ──
pool.on("connect", () => {
  console.log("[DB] New client connected to pool successfully");
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle client:", err.message);
});

/**
 * Test kết nối database với cơ chế tự động thử lại (Retry) để xử lý Neon Cold Start.
 * @returns {Promise<string>} Thời gian hiện tại từ DB server
 */
async function testConnection() {
  let retries = 5;
  let delay = 2000;
  while (retries > 0) {
    try {
      const result = await pool.query("SELECT NOW() AS server_time");
      return result.rows[0].server_time;
    } catch (err) {
      retries--;
      if (retries === 0) {
        throw err;
      }
      console.warn(`[DB] Connection test failed (Neon DB might be sleeping). Retrying in ${delay}ms... (Attempts left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // Tăng dần khoảng chờ giữa các lần thử lại
    }
  }
}

/**
 * Helper: Chạy 1 query đơn giản (auto checkout & release connection)
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  // Log slow queries (> 200ms) để debug performance
  if (duration > 200) {
    console.warn("[DB] Slow query:", { text, duration: `${duration}ms`, rows: result.rowCount });
  }

  // Tự động dọn dẹp cache nếu có câu lệnh ghi (INSERT, UPDATE, DELETE)
  // trên các bảng liên quan đến hiển thị nội dung công khai
  const queryLower = text.toLowerCase();
  if (
    queryLower.includes("insert ") ||
    queryLower.includes("update ") ||
    queryLower.includes("delete ")
  ) {
    if (
      queryLower.includes("stories") ||
      queryLower.includes("chapters") ||
      queryLower.includes("categories") ||
      queryLower.includes("likes") ||
      queryLower.includes("ratings") ||
      queryLower.includes("site_settings")
    ) {
      try {
        const cache = require("../utils/cache");
        cache.deletePattern("stories:");
        cache.deletePattern("chapters:");
        console.log(`[Cache] DB Write detected. Invalidated public cache. Query: ${text.slice(0, 50)}...`);
      } catch (cacheErr) {
        // Bỏ qua lỗi nếu có (ví dụ circular dependency)
      }
    }
  }

  return result;
}

/**
 * Helper: Lấy 1 client từ pool để chạy transaction
 */
async function getClient() {
  return pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
};
