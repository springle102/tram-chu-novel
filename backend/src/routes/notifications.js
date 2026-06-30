// ============================================================
// Trạm Chữ Novel — Reader Notifications Routes
// ============================================================
// Định tuyến API cho thông báo của độc giả (reader).
// Tất cả các route yêu cầu xác thực JWT.
// ============================================================

const { Router } = require("express");
const { verifyToken } = require("../middleware/adminAuth");
const db = require("../config/db");

const router = Router();

// Tất cả các route dưới đây yêu cầu xác thực token của độc giả
router.use(verifyToken);

// GET /api/notifications
// Lấy danh sách thông báo của độc giả hiện tại
router.get("/", async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    const queryField = role === 'author' ? 'author_id' : 'user_id';
    const result = await db.query(
      `SELECT id, type, title, message, link, is_read, created_at 
       FROM notifications 
       WHERE ${queryField} = $1
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    // Map links for author role on reader page
    const mappedData = result.rows.map(item => {
      let link = item.link;
      if (role === 'author' && link) {
        if (link.includes('?slug=')) {
          const parts = link.split('?slug=');
          const slug = parts[1] ? parts[1].split('&')[0] : '';
          if (item.type === 'new_comment' || item.type === 'comment_reply') {
            link = `/stories/${slug}#comment-section`;
          } else {
            link = `/stories/${slug}`;
          }
        } else if (link === '/admin/comments') {
          link = '/';
        } else if (link === '/admin/stories') {
          link = '/';
        }
      }
      return { ...item, link };
    });

    res.json({ success: true, data: mappedData });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read
// Đánh dấu một thông báo là đã đọc
router.put("/:id/read", async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    const { id } = req.params;
    const queryField = role === 'author' ? 'author_id' : 'user_id';
    const result = await db.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND ${queryField} = $2
       RETURNING id`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Thông báo không tồn tại hoặc không có quyền." });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all
// Đánh dấu tất cả thông báo của độc giả hiện tại là đã đọc
router.put("/read-all", async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    const queryField = role === 'author' ? 'author_id' : 'user_id';
    await db.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE ${queryField} = $1 AND is_read = false`,
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
