const db = require('../config/db');

async function createReport(req, res, next) {
  try {
    const { storyId, commentId, reason } = req.body;
    const userId = req.user.userId;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ success: false, error: 'Lý do báo lỗi không được để trống.' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const reportRes = await client.query(
        `INSERT INTO reports (user_id, story_id, comment_id, reason)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, storyId || null, commentId || null, reason.trim()]
      );

      // Create notification for admin only (both user_id and author_id are NULL)
      await client.query(
        `INSERT INTO notifications (type, title, message, link)
         VALUES ($1, $2, $3, $4)`,
        [
          'new_report',
          'Báo lỗi mới',
          `Một độc giả vừa gửi báo lỗi mới. Lý do: ${reason.trim()}`,
          `/admin/dashboard` // Or another relevant admin page
        ]
      );

      await client.query('COMMIT');
      res.status(201).json({ success: true, message: 'Báo lỗi của bạn đã được gửi thành công.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

async function getMyReports(req, res, next) {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      `SELECT r.id, r.story_id, r.comment_id, r.reason, r.status, r.created_at,
              s.title as story_title, s.slug as story_slug
       FROM reports r
       LEFT JOIN stories s ON r.story_id = s.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createReport,
  getMyReports
};
