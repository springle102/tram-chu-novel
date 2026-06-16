// ============================================================
// Novel Violet — Central Route Index
// ============================================================
// Gom tất cả route modules vào 1 file.
// Server.js chỉ cần import file này.
// ============================================================

const { Router } = require("express");
const storiesRoutes = require("./stories");
const authRoutes = require("./auth");
const adminRoutes = require("./admin");

const router = Router();

// ── Health Check ──
// Dùng để monitoring (Docker healthcheck, load balancer, uptime robot)
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Mount route modules ──
router.use("/stories", storiesRoutes);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);

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

