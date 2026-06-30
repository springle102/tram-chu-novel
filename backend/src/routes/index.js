// ============================================================
// Trạm Chữ Novel — Central Route Index
// ============================================================
// Gom tất cả route modules vào 1 file.
// Server.js chỉ cần import file này.
// ============================================================

const { Router } = require("express");
const storiesRoutes = require("./stories");
const authRoutes = require("./auth");
const adminRoutes = require("./admin");
const notificationsRoutes = require("./notifications");
const reportsRoutes = require("./reports");

const router = Router();

// ── Health Check ──
// Dùng để monitoring (Docker healthcheck, load balancer, uptime robot) và kiểm tra cold start của Neon
router.get("/health", async (_req, res) => {
  try {
    const db = require("../config/db");
    await db.query("SELECT 1"); // Kiểm tra kết nối database thực tế
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Mount route modules ──
router.use("/stories", storiesRoutes);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/reports", reportsRoutes);

// GET /api/categories
router.get("/categories", async (req, res, next) => {
  try {
    const db = require("../config/db");
    const result = await db.query(`SELECT id, name, slug FROM categories ORDER BY name ASC`);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/authors (Public - tìm kiếm hồ sơ tác giả)
router.get("/authors", async (req, res, next) => {
  try {
    const db = require("../config/db");
    const { search } = req.query;

    let query = `
      SELECT id, pen_name, avatar_url, bio, created_at
      FROM authors
      WHERE is_banned = false
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND pen_name ILIKE $1`;
    }
    query += ` ORDER BY pen_name ASC LIMIT 6`;

    const result = await db.query(query, params);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/authors/:id (Public - Chi tiết hồ sơ tác giả)
router.get("/authors/:id", async (req, res, next) => {
  try {
    const db = require("../config/db");
    const { id } = req.params;

    // 1. Fetch Author details (pen_name, avatar_url, bio, donation_link)
    const authorResult = await db.query(
      `SELECT id, pen_name, avatar_url, bio, donation_link 
       FROM authors 
       WHERE id = $1 AND is_banned = false`,
      [id]
    );

    if (authorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy tác giả."
      });
    }

    const author = authorResult.rows[0];

    // 2. Fetch Author's published stories
    const storiesResult = await db.query(
      `SELECT s.id, s.title, s.slug, s.cover_image, s.description, s.status, s.view_count, s.rating, s.chapter_count, s.like_count,
              (
                SELECT COALESCE(json_agg(json_build_object('id', cat.id, 'name', cat.name)), '[]'::json)
                FROM story_categories sc
                JOIN categories cat ON sc.category_id = cat.id
                WHERE sc.story_id = s.id
              ) AS categories
       FROM stories s
       WHERE s.author_id = $1
       ORDER BY s.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        author,
        stories: storiesResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/settings (Public - cho Frontend/Metadata)
router.get("/settings", async (req, res, next) => {
  try {
    const db = require("../config/db");
    // Chỉ trả về public settings để bảo mật, hoặc toàn bộ nếu site_settings không chứa nhạy cảm
    const result = await db.query('SELECT key, value, description FROM site_settings ORDER BY key ASC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});
// router.use("/users", usersRoutes);
// router.use("/chapters", chaptersRoutes);

module.exports = router;

