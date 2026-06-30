// ============================================================
// Trạm Chữ Novel — Express Server Entry Point
// ============================================================
// Khởi tạo server Express với đầy đủ middleware:
// - CORS (cho phép frontend gọi API)
// - JSON body parser
// - Request logging
// - Routes
// - Error handling
// ============================================================

// Load biến môi trường từ .env TRƯỚC KHI import bất kỳ module nào
require("dotenv").config({ path: require('path').resolve(__dirname, '../.env') });

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const db = require("./config/db");

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

// ────────────────────────────────────────────────────────────
// MIDDLEWARE
// ────────────────────────────────────────────────────────────

// ── CORS ──
// Cho phép các port localhost và 127.0.0.1 gọi API tự động để phát triển thuận tiện
app.use(
  cors({
    origin: function (origin, callback) {
      // Cho phép requests không có origin (như mobile, curl, postman)
      if (!origin) return callback(null, true);

      // Kiểm tra xem có phải local request không
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin === "http://localhost" ||
        origin === "http://127.0.0.1"
      ) {
        return callback(null, true);
      }

      const allowed = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
        : ["http://localhost:3000"];

      // Kiểm tra xem origin có khớp chính xác hoặc khớp wildcard (*.pages.dev) không
      const isAllowed = allowed.some((domain) => {
        if (domain.includes("*")) {
          const escapedPattern = domain
            .replace(/\./g, "\\.")
            .replace(/\*/g, "[a-zA-Z0-9-._]+");
          const regex = new RegExp(`^${escapedPattern}$`, "i");
          return regex.test(origin);
        }
        return domain === origin;
      });

      if (isAllowed) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ── Body Parser ──
// Giới hạn body 5MB để tránh abuse
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ── Request Logger (đơn giản) ──
// Production nên dùng morgan hoặc pino
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ────────────────────────────────────────────────────────────
// ROUTES
// ────────────────────────────────────────────────────────────

// ── Rate Limiter cho các API công khai ──
// Giới hạn 100 requests mỗi 15 phút cho mỗi IP để chống bot crawl / ddos free tier
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Tối đa 100 requests từ một IP
  message: {
    success: false,
    error: "Quá nhiều yêu cầu từ địa chỉ IP này. Vui lòng quay lại sau 15 phút.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Đăng ký rate limiter cho các public APIs
app.use("/api/stories", publicLimiter);
app.use("/api/categories", publicLimiter);
app.use("/api/authors", publicLimiter);

// Mount tất cả API routes dưới prefix /api
app.use("/api", routes);

// ────────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────────

// 404: Không tìm thấy route
app.use(notFoundHandler);

// Global error handler (phải đặt cuối cùng)
app.use(errorHandler);

// ────────────────────────────────────────────────────────────
// START SERVER
// ────────────────────────────────────────────────────────────

async function start() {
  try {
    // Test database connection
    const serverTime = await db.testConnection();
    console.log(`[DB] ✓ Connected to "${process.env.DB_NAME || "Violet_db"}" successfully`);
    console.log(`[DB]   Server time: ${serverTime}`);
  } catch (err) {
    console.error("[FATAL] Cannot connect to database:", err.message);
    console.error("");
    console.error("Hãy kiểm tra:");
    console.error("  1. PostgreSQL đang chạy");
    console.error(`  2. Database "${process.env.DB_NAME || "Violet_db"}" đã tồn tại`);
    console.error("  3. File .env có đúng thông tin kết nối (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)");
    console.error("  4. User PostgreSQL có quyền truy cập database này");
    process.exit(1);
  }

  // Run database migrations and seeding safely
  try {
    // Dynamic schema migration: add scheduled_at column to chapters table if it doesn't exist
    await db.query(`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;`);
    // Dynamic schema migration: add display_name column to users table if it doesn't exist
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);`);

    // Dynamic schema migration: bổ sung các giá trị enum thông báo mới nếu chưa có
    try {
      await db.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_comment';`);
      await db.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'comment_reply';`);
      await db.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_rating';`);
      await db.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_bookmark';`);
      await db.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_like';`);
      await db.query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_report';`);
    } catch (enumErr) {
      console.warn(`[DB] ⚠ Enum migration warning: ${enumErr.message}`);
    }

    // Dynamic schema migration: bổ sung các giá trị enum trạng thái báo lỗi mới nếu chưa có
    try {
      await db.query(`ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'accepted';`);
      await db.query(`ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'processing';`);
      await db.query(`ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'resolved';`);
      await db.query(`ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'rejected';`);
    } catch (enumErr) {
      console.warn(`[DB] ⚠ Enum report_status migration warning: ${enumErr.message}`);
    }



    // Dynamic schema migration: create likes table and add like_count to stories table
    try {
      await db.query(`ALTER TABLE stories ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;`);
      await db.query(`
        CREATE TABLE IF NOT EXISTS likes (
          id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id       VARCHAR(50)  NOT NULL,
          story_id      VARCHAR(50)  NOT NULL,
          created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          CONSTRAINT fk_likes_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
          CONSTRAINT uq_likes_user_story UNIQUE (user_id, story_id)
        );
      `);
    } catch (likeErr) {
      console.warn(`[DB] ⚠ Likes table migration warning: ${likeErr.message}`);
    }

    try {
      await db.query(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notification_owner;`);
      await db.query(`ALTER TABLE notifications ADD CONSTRAINT chk_notification_owner CHECK ((user_id IS NOT NULL AND author_id IS NULL) OR (user_id IS NULL AND author_id IS NOT NULL) OR (user_id IS NULL AND author_id IS NULL));`);
    } catch (migErr) {
      console.warn(`[DB] ⚠ Constraint migration warning: ${migErr.message}`);
    }

    console.log(`[DB] ✓ Database migration completed: chapters.scheduled_at, users.display_name, notification_type enum values, likes table and like_count verified/added.`);

    // Dynamic schema migration: create story_categories junction table
    await db.query(`
      CREATE TABLE IF NOT EXISTS story_categories (
        story_id VARCHAR(50) NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (story_id, category_id)
      );
      CREATE INDEX IF NOT EXISTS idx_story_categories_story_id ON story_categories (story_id);
      CREATE INDEX IF NOT EXISTS idx_story_categories_category_id ON story_categories (category_id);
    `);

    // Copy existing relations if any
    await db.query(`
      INSERT INTO story_categories (story_id, category_id)
      SELECT id, category_id FROM stories WHERE category_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);
    console.log(`[DB] ✓ Database migration completed: story_categories table and index verified, data synced.`);

    // Seed new categories if they don't exist
    await db.query(`
      INSERT INTO categories (id, name, slug) VALUES
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c09', 'Tu chân', 'tu-chan'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c0a', 'Bách hợp', 'bach-hop'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c0b', 'Vô hạn lưu', 'vo-han-luu'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c0c', 'Xuyên không', 'xuyen-khong'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c0d', 'Trọng sinh', 'trong-sinh'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c0e', 'Hệ thống', 'he-thong'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c0f', 'Võng du', 'vong-du'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'Mạt thế', 'mat-the'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 'Cung đấu', 'cung-dau'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13', 'Đồng nhân', 'dong-nhan'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c14', 'Kinh dị', 'kinh-di'),
      ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c15', 'Linh dị', 'linh-di')
      ON CONFLICT (slug) DO NOTHING;
    `);
    console.log(`[DB] ✓ Database migration completed: new categories seeded.`);

    // Seed default admin and author accounts
    await db.query(`
      INSERT INTO admins (id, username, email, password, avatar_url) VALUES
      ('AD01', 'Admin', 'support.tramchunovel@gmail.com', '123456', 'https://placehold.co/150x150/dc2626/white?text=AD')
      ON CONFLICT (email) DO NOTHING;

      INSERT INTO authors (id, pen_name, email, password, avatar_url) VALUES
      ('AU01', 'Miyano Harumi', 'miyanoharumi123@gmail.com', 'anhxuan2005', 'https://placehold.co/150x150/7c3aed/white?text=AU')
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log(`[DB] ✓ Database migration completed: default admin and author seeded.`);
  } catch (migErr) {
    console.warn(`[DB] ⚠ Migration/Seeding warning: ${migErr.message}`);
    console.warn(`[DB] ⚠ Vui lòng chạy lệnh: "node reset_db.js" trong thư mục backend để reset và cập nhật cấu trúc bảng mới!`);
  }

  // Start HTTP Server listening
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Trạm Chữ Novel API Server`);
    console.log(`  Port:     ${PORT}`);
    console.log(`  Mode:     ${process.env.NODE_ENV || "development"}`);
    console.log(`  Database: ${process.env.DB_NAME || "Violet_db"}`);
    console.log(`  DB Host:  ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}`);
    console.log(`========================================\n`);
  });
}

const listEndpoints = require('express-list-endpoints');

// In danh sách các route ra console
console.log("=== DANH SÁCH API HIỆN CÓ ===");
console.log(listEndpoints(app));

// Graceful shutdown — đóng connection pool khi process bị kill
process.on("SIGTERM", async () => {
  console.log("[Server] SIGTERM received. Shutting down gracefully...");
  await db.pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\n[Server] SIGINT received. Shutting down gracefully...");
  await db.pool.end();
  process.exit(0);
});

start();
