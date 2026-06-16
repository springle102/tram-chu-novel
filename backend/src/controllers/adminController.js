// ============================================================
// Novel Violet — Admin Controller
// ============================================================
// Xử lý logic nghiệp vụ cho admin panel.
// Bao gồm: Dashboard, Stories, Users, Categories, Comments, Settings
// ============================================================

const db = require('../config/db');

// ── DASHBOARD ──
// GET /api/admin/dashboard
// Admin: xem tổng quan toàn hệ thống
// Author: chỉ xem dữ liệu cá nhân
async function getDashboardStats(req, res, next) {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.userId;

    if (isAdmin) {
      // Admin sees everything
      const [usersCount, storiesCount, authorsCount, totalViews, recentStories, recentUsers, categoriesStats, commentsCount, reportsCount] = await Promise.all([
        db.query('SELECT COUNT(*) FROM users'),
        db.query('SELECT COUNT(*) FROM stories'),
        db.query('SELECT COUNT(*) FROM authors'),
        db.query('SELECT COALESCE(SUM(view_count), 0) as total FROM stories'),
        db.query(`SELECT s.id, s.title, s.slug, s.status, s.view_count, s.rating, s.chapter_count, s.created_at, s.updated_at,
                  a.pen_name as author_name,
                  (
                    SELECT COALESCE(json_agg(json_build_object('id', cat.id, 'name', cat.name)), '[]'::json)
                    FROM story_categories sc
                    JOIN categories cat ON sc.category_id = cat.id
                    WHERE sc.story_id = s.id
                  ) as categories
                  FROM stories s
                  JOIN authors a ON s.author_id = a.id
                  ORDER BY s.created_at DESC LIMIT 5`),
        db.query(`SELECT id, username, email, role, avatar_url, created_at FROM (
                    SELECT id, username, email, 'reader'::text as role, avatar_url, created_at FROM users
                    UNION ALL
                    SELECT id, pen_name as username, email, 'author'::text as role, avatar_url, created_at FROM authors
                  ) as combined ORDER BY created_at DESC LIMIT 5`),
        db.query(`SELECT c.name, COUNT(sc.story_id) as count FROM categories c LEFT JOIN story_categories sc ON sc.category_id = c.id GROUP BY c.id, c.name ORDER BY count DESC`),
        db.query('SELECT COUNT(*) FROM comments'),
        db.query("SELECT COUNT(*) FROM reports WHERE status = 'pending'")
      ]);
      res.json({ success: true, data: {
        stats: {
          totalUsers: parseInt(usersCount.rows[0].count),
          totalStories: parseInt(storiesCount.rows[0].count),
          totalAuthors: parseInt(authorsCount.rows[0].count),
          totalViews: parseInt(totalViews.rows[0].total),
          totalComments: parseInt(commentsCount.rows[0].count),
          pendingReports: parseInt(reportsCount.rows[0].count)
        },
        recentStories: recentStories.rows,
        recentUsers: recentUsers.rows,
        categoriesStats: categoriesStats.rows
      }});
    } else {
      // Author sees only their data
      const [myStories, myViews, myProfile, myCommentsCount, myAvgRating] = await Promise.all([
        db.query(`SELECT s.id, s.title, s.slug, s.status, s.view_count, s.rating, s.chapter_count, s.created_at, s.updated_at,
                  (
                    SELECT COALESCE(json_agg(json_build_object('id', cat.id, 'name', cat.name)), '[]'::json)
                    FROM story_categories sc
                    JOIN categories cat ON sc.category_id = cat.id
                    WHERE sc.story_id = s.id
                  ) as categories
                  FROM stories s
                  WHERE s.author_id = $1 ORDER BY s.updated_at DESC`, [userId]),
        db.query('SELECT COALESCE(SUM(view_count), 0) as total, COUNT(*) as story_count FROM stories WHERE author_id = $1', [userId]),
        db.query('SELECT pen_name, bio, donation_link, total_views FROM authors WHERE id = $1', [userId]),
        db.query('SELECT COUNT(cm.id) as count FROM comments cm JOIN stories s ON cm.story_id = s.id WHERE s.author_id = $1', [userId]),
        db.query('SELECT COALESCE(AVG(rating), 0) as avg FROM stories WHERE author_id = $1', [userId])
      ]);
      res.json({ success: true, data: {
        stats: {
          totalStories: parseInt(myViews.rows[0].story_count),
          totalViews: parseInt(myViews.rows[0].total),
          totalComments: parseInt(myCommentsCount.rows[0].count),
          avgRating: parseFloat(myAvgRating.rows[0].avg)
        },
        stories: myStories.rows,
        profile: myProfile.rows[0] || null
      }});
    }
  } catch (err) {
    next(err);
  }
}

// ── STORIES ──
// GET /api/admin/stories?page=1&limit=10&search=&status=&category=
// Admin: xem tất cả truyện, Author: chỉ xem truyện của mình
async function getStories(req, res, next) {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const categoryId = req.query.category || '';

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (!isAdmin) {
      whereConditions.push(`s.author_id = $${paramIndex++}`);
      params.push(userId);
    } else if (req.query.authorId) {
      whereConditions.push(`s.author_id = $${paramIndex++}`);
      params.push(req.query.authorId);
    }
    if (search) {
      whereConditions.push(`s.title ILIKE $${paramIndex++}`);
      params.push(`%${search}%`);
    }
    if (status && ['ongoing', 'completed'].includes(status)) {
      whereConditions.push(`s.status = $${paramIndex++}`);
      params.push(status);
    }
    if (categoryId) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM story_categories sc
        WHERE sc.story_id = s.id AND sc.category_id = $${paramIndex++}
      )`);
      params.push(categoryId);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const countQuery = `SELECT COUNT(*) FROM stories s ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT s.id, s.title, s.slug, s.cover_image, s.description, s.status, s.view_count, s.rating,
             s.chapter_count, s.created_at, s.updated_at,
             a.pen_name as author_name, a.id as author_id,
             (
               SELECT COALESCE(json_agg(json_build_object('id', cat.id, 'name', cat.name)), '[]'::json)
               FROM story_categories sc
               JOIN categories cat ON sc.category_id = cat.id
               WHERE sc.story_id = s.id
             ) as categories
      FROM stories s
      JOIN authors a ON s.author_id = a.id
      ${whereClause}
      ORDER BY s.updated_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);
    const result = await db.query(dataQuery, params);

    res.json({ success: true, data: {
      stories: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }});
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/stories/:id
// Admin: xóa bất kỳ truyện nào, Author: chỉ xóa truyện của mình
async function deleteStory(req, res, next) {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.userId;

    let query = 'DELETE FROM stories WHERE id = $1';
    let params = [id];
    if (!isAdmin) {
      query += ' AND author_id = $2';
      params.push(userId);
    }
    query += ' RETURNING id, title';

    const result = await db.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Truyện không tồn tại hoặc bạn không có quyền xóa.' });
    }
    res.json({ success: true, message: `Đã xóa truyện "${result.rows[0].title}"` });
  } catch (err) {
    next(err);
  }
}

// ── USERS (Admin only) ──
// GET /api/admin/users?page=1&limit=10&search=&role=
async function getUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    let total = 0;
    let users = [];

    if (role === 'reader') {
      const whereConditions = [];
      const params = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(`(username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const countResult = await db.query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
      total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT id, username, email, 'reader'::text as role, avatar_url, is_banned, banned_at, ban_reason, created_at, last_login_at
        FROM users ${whereClause}
        ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      const dataParams = [...params, limit, offset];
      const result = await db.query(dataQuery, dataParams);
      users = result.rows;
    } else if (role === 'author') {
      const whereConditions = [];
      const params = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(`(pen_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const countResult = await db.query(`SELECT COUNT(*) FROM authors ${whereClause}`, params);
      total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT id, pen_name as username, email, 'author'::text as role, avatar_url, is_banned, banned_at, ban_reason, created_at, last_login_at
        FROM authors ${whereClause}
        ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      const dataParams = [...params, limit, offset];
      const result = await db.query(dataQuery, dataParams);
      users = result.rows;
    } else {
      // All roles (combined)
      const countQuery = `
        SELECT (
          SELECT COUNT(*) FROM users ${search ? 'WHERE username ILIKE $1 OR email ILIKE $1' : ''}
        ) + (
          SELECT COUNT(*) FROM authors ${search ? 'WHERE pen_name ILIKE $1 OR email ILIKE $1' : ''}
        ) as count
      `;
      const params = search ? [`%${search}%`] : [];
      const countResult = await db.query(countQuery, params);
      total = parseInt(countResult.rows[0].count);

      const dataQuery = `
        SELECT id, username, email, role, avatar_url, is_banned, banned_at, ban_reason, created_at, last_login_at
        FROM (
          SELECT id, username, email, 'reader'::text as role, avatar_url, is_banned, banned_at, ban_reason, created_at, last_login_at FROM users
          UNION ALL
          SELECT id, pen_name as username, email, 'author'::text as role, avatar_url, is_banned, banned_at, ban_reason, created_at, last_login_at FROM authors
        ) as combined
        ${search ? 'WHERE combined.username ILIKE $3 OR combined.email ILIKE $3' : ''}
        ORDER BY created_at DESC LIMIT $1 OFFSET $2
      `;
      const dataParams = [limit, offset];
      if (search) {
        dataParams.push(`%${search}%`);
      }
      const result = await db.query(dataQuery, dataParams);
      users = result.rows;
    }

    // Also get role counts for the filter tabs
    const [readerCounts, authorCounts] = await Promise.all([
      db.query("SELECT 'reader' as role, COUNT(*) as count, COUNT(*) FILTER (WHERE is_banned = true) as banned_count FROM users"),
      db.query("SELECT 'author' as role, COUNT(*) as count, COUNT(*) FILTER (WHERE is_banned = true) as banned_count FROM authors")
    ]);
    const roleCounts = [...readerCounts.rows, ...authorCounts.rows];

    res.json({ success: true, data: {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      roleCounts
    }});
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/ban
// Khóa hoặc mở khóa tài khoản người dùng
async function toggleBanUser(req, res, next) {
  try {
    const { id } = req.params;
    const { ban, reason } = req.body; // ban: true/false

    const updateReaderQuery = ban
      ? `UPDATE users SET is_banned = true, banned_at = NOW(), ban_reason = $2 WHERE id = $1 RETURNING id, username, is_banned`
      : `UPDATE users SET is_banned = false, banned_at = NULL, ban_reason = NULL WHERE id = $1 RETURNING id, username, is_banned`;
    const readerParams = ban ? [id, reason || 'Vi phạm quy định'] : [id];

    let result = await db.query(updateReaderQuery, readerParams);

    if (result.rows.length === 0) {
      const updateAuthorQuery = ban
        ? `UPDATE authors SET is_banned = true, banned_at = NOW(), ban_reason = $2 WHERE id = $1 RETURNING id, pen_name as username, is_banned`
        : `UPDATE authors SET is_banned = false, banned_at = NULL, ban_reason = NULL WHERE id = $1 RETURNING id, pen_name as username, is_banned`;
      const authorParams = ban ? [id, reason || 'Vi phạm quy định'] : [id];
      result = await db.query(updateAuthorQuery, authorParams);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản người dùng hoặc tác giả.' });
    }
    res.json({ success: true, message: ban ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/comment-permission
// Bật hoặc tắt quyền bình luận của độc giả
async function toggleCommentPermission(req, res, next) {
  try {
    const { id } = req.params;
    const { canComment } = req.body; // true/false

    const result = await db.query(
      `UPDATE users 
       SET can_comment = $2 
       WHERE id = $1 
       RETURNING id, username, can_comment`,
      [id, canComment]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });
    }

    res.json({ 
      success: true, 
      message: canComment ? 'Đã bật quyền bình luận của độc giả.' : 'Đã tắt quyền bình luận của độc giả.', 
      data: result.rows[0] 
    });
  } catch (err) {
    next(err);
  }
}

// ── CATEGORIES ──
// GET /api/admin/categories
async function getCategories(req, res, next) {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.slug, COUNT(s.id) as story_count
       FROM categories c LEFT JOIN stories s ON s.category_id = c.id
       GROUP BY c.id, c.name, c.slug ORDER BY c.name ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/categories
async function createCategory(req, res, next) {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, error: 'Tên và slug là bắt buộc.' });
    }
    const result = await db.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug',
      [name.trim(), slug.trim().toLowerCase()]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Slug này đã tồn tại.' });
    }
    next(err);
  }
}

// DELETE /api/admin/categories/:id
async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM categories WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Thể loại không tồn tại.' });
    }
    res.json({ success: true, message: `Đã xóa thể loại "${result.rows[0].name}"` });
  } catch (err) {
    next(err);
  }
}

// ── COMMENTS (Admin + Author) ──
// GET /api/admin/comments?page=1&limit=10&status=
async function getComments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.userId;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (!isAdmin) {
      whereConditions.push(`s.author_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      whereConditions.push(`cm.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const countQuery = `
      SELECT COUNT(*) 
      FROM comments cm
      JOIN stories s ON cm.story_id = s.id
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT cm.id, cm.content, cm.status, cm.created_at,
             COALESCE(u.username, a.pen_name) as user_name,
             COALESCE(u.avatar_url, a.avatar_url) as user_avatar,
             u.id as user_id,
             a.id as author_id,
             COALESCE(u.can_comment, true) as user_can_comment,
             s.title as story_title, s.slug as story_slug
      FROM comments cm
      LEFT JOIN users u ON cm.user_id = u.id
      LEFT JOIN authors a ON cm.author_id = a.id
      JOIN stories s ON cm.story_id = s.id
      ${whereClause}
      ORDER BY cm.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    const dataParams = [...params, limit, offset];
    const result = await db.query(dataQuery, dataParams);

    // Get status counts (scoped if Author)
    let statusCounts;
    if (isAdmin) {
      statusCounts = await db.query(
        "SELECT status, COUNT(*) as count FROM comments GROUP BY status"
      );
    } else {
      statusCounts = await db.query(
        `SELECT cm.status, COUNT(*) as count 
         FROM comments cm
         JOIN stories s ON cm.story_id = s.id
         WHERE s.author_id = $1
         GROUP BY cm.status`,
        [userId]
      );
    }

    res.json({ success: true, data: {
      comments: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      statusCounts: statusCounts.rows
    }});
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/comments/:id
// Cập nhật trạng thái bình luận (pending/approved/rejected)
async function updateCommentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.userId;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ.' });
    }

    let result;
    if (isAdmin) {
      result = await db.query(
        'UPDATE comments SET status = $2 WHERE id = $1 RETURNING id, status',
        [id, status]
      );
    } else {
      // Author can only update comments on stories they own
      result = await db.query(
        `UPDATE comments cm
         SET status = $2
         FROM stories s
         WHERE cm.id = $1 AND cm.story_id = s.id AND s.author_id = $3
         RETURNING cm.id, cm.status`,
        [id, status, userId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bình luận không tồn tại hoặc bạn không có quyền cập nhật.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/comments/:id
async function deleteComment(req, res, next) {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.userId;

    let result;
    if (isAdmin) {
      result = await db.query('DELETE FROM comments WHERE id = $1 RETURNING id', [id]);
    } else {
      // Author can only delete comments on stories they own
      result = await db.query(
        `DELETE FROM comments cm
         USING stories s
         WHERE cm.id = $1 AND cm.story_id = s.id AND s.author_id = $2
         RETURNING cm.id`,
        [id, userId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bình luận không tồn tại hoặc bạn không có quyền xóa.' });
    }
    res.json({ success: true, message: 'Đã xóa bình luận.' });
  } catch (err) {
    next(err);
  }
}

// ── SETTINGS (Admin only) ──
// GET /api/admin/settings
async function getSettings(req, res, next) {
  try {
    const result = await db.query('SELECT key, value, description, updated_at FROM site_settings ORDER BY key ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/settings
// Cập nhật nhiều cài đặt cùng lúc (transaction)
async function updateSettings(req, res, next) {
  try {
    const { settings } = req.body; // Array of { key, value }
    if (!Array.isArray(settings)) {
      return res.status(400).json({ success: false, error: 'Settings phải là một mảng.' });
    }
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const { key, value } of settings) {
        await client.query(
          `INSERT INTO site_settings (key, value, updated_at, updated_by)
           VALUES ($3, $1, NOW(), $2)
           ON CONFLICT (key) DO UPDATE 
           SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
          [String(value), req.user.userId, key]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    res.json({ success: true, message: 'Đã cập nhật cài đặt.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/profile
// Lấy thông tin cá nhân của người dùng hiện tại (Admin hoặc Author)
async function getMyProfile(req, res, next) {
  try {
    const { userId, role } = req.user;

    if (role === 'admin') {
      const result = await db.query(
        'SELECT id, username, email, avatar_url, created_at, last_login_at FROM admins WHERE id = $1',
        [userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản Admin.' });
      }
      return res.json({ success: true, data: { ...result.rows[0], role } });
    } else if (role === 'author') {
      const result = await db.query(
        'SELECT id, pen_name as username, email, avatar_url, bio, donation_link, created_at, last_login_at FROM authors WHERE id = $1',
        [userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản Tác giả.' });
      }
      return res.json({ success: true, data: { ...result.rows[0], role } });
    } else {
      return res.status(403).json({ success: false, error: 'Vai trò không hợp lệ.' });
    }
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/profile
// Cập nhật thông tin cá nhân của người dùng hiện tại (Admin hoặc Author)
async function updateMyProfile(req, res, next) {
  try {
    const { userId, role } = req.user;
    const { username, email, password, avatarUrl, bio, donationLink } = req.body;

    if (!username || !email) {
      return res.status(400).json({ success: false, error: 'Tên và email là bắt buộc.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (role === 'admin') {
      // Check duplicate email in admins table (excluding self)
      const emailCheck = await db.query(
        'SELECT id FROM admins WHERE email = $1 AND id != $2',
        [normalizedEmail, userId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Email đã được sử dụng bởi quản trị viên khác.' });
      }

      let query = 'UPDATE admins SET username = $1, email = $2, avatar_url = $3';
      let params = [username.trim(), normalizedEmail, avatarUrl || null];

      if (password && password.trim().length >= 6) {
        query += ', password = $4 WHERE id = $5';
        params.push(password, userId);
      } else {
        query += ' WHERE id = $4';
        params.push(userId);
      }

      query += ' RETURNING id, username, email, avatar_url, created_at';

      const result = await db.query(query, params);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản Admin.' });
      }

      return res.json({
        success: true,
        message: 'Cập nhật hồ sơ thành công!',
        data: {
          id: result.rows[0].id,
          fullName: result.rows[0].username,
          email: result.rows[0].email,
          avatarUrl: result.rows[0].avatar_url,
          role,
          createdAt: result.rows[0].created_at
        }
      });

    } else if (role === 'author') {
      // Check duplicate email in authors table (excluding self)
      const emailCheck = await db.query(
        'SELECT id FROM authors WHERE email = $1 AND id != $2',
        [normalizedEmail, userId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Email đã được sử dụng bởi tác giả khác.' });
      }

      let query = 'UPDATE authors SET pen_name = $1, email = $2, avatar_url = $3, bio = $4, donation_link = $5';
      let params = [username.trim(), normalizedEmail, avatarUrl || null, bio || '', donationLink || ''];
      let paramIndex = 6;

      if (password && password.trim().length >= 6) {
        query += `, password = $${paramIndex++} WHERE id = $${paramIndex++}`;
        params.push(password, userId);
      } else {
        query += ` WHERE id = $${paramIndex++}`;
        params.push(userId);
      }

      query += ' RETURNING id, pen_name, email, avatar_url, bio, donation_link, created_at';

      const result = await db.query(query, params);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản Tác giả.' });
      }

      return res.json({
        success: true,
        message: 'Cập nhật hồ sơ thành công!',
        data: {
          id: result.rows[0].id,
          fullName: result.rows[0].pen_name,
          email: result.rows[0].email,
          avatarUrl: result.rows[0].avatar_url,
          bio: result.rows[0].bio,
          donationLink: result.rows[0].donation_link,
          role,
          createdAt: result.rows[0].created_at
        }
      });
    } else {
      return res.status(403).json({ success: false, error: 'Vai trò không hợp lệ.' });
    }
  } catch (err) {
    next(err);
  }
}

// ── NEW STORY & CHAPTER CONTROLLERS FOR AUTHOR ──

function generateSlug(text) {
  const vietnameseMap = {
    à: "a", á: "a", ả: "a", ã: "a", ạ: "a", ă: "a", ắ: "a", ằ: "a", ẳ: "a", ẵ: "a", ặ: "a", â: "a", ấ: "a", ầ: "a", ẩ: "a", ẫ: "a", ậ: "a",
    è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e", ê: "e", ế: "e", ề: "e", ể: "e", ễ: "e", ệ: "e",
    ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
    ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o", ô: "o", ố: "o", ồ: "o", ổ: "o", ỗ: "o", ộ: "o", ơ: "o", ớ: "o", ờ: "o", ở: "o", ỡ: "o", ợ: "o",
    ù: "u", ú: "u", ủ: "u", ũ: "u", cụ: "u", ư: "u", ứ: "u", ừ: "u", ử: "u", ữ: "u", ự: "u",
    ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y", đ: "d",
    À: "a", Á: "a", Ả: "a", Ã: "a", Ạ: "a", Ă: "a", Ắ: "a", Ằ: "a", Ả: "a", Ẵ: "a", Ặ: "a", Â: "a", Ấ: "a", Ầ: "a", Ẩ: "a", Ẫ: "a", Ậ: "a",
    È: "e", É: "e", Ẻ: "e", Ẽ: "e", Ẹ: "e", Ê: "e", Ế: "e", Ề: "e", Ể: "e", Ễ: "e", Ệ: "e",
    Ì: "i", Í: "i", Ỉ: "i", Ĩ: "i", Ị: "i",
    Ò: "o", ó: "o", Ỏ: "o", Õ: "o", Ọ: "o", Ô: "o", Ố: "o", Ồ: "o", Ổ: "o", Ỗ: "o", Ộ: "o", Ơ: "o", Ớ: "o", ờ: "o", ở: "o", ỡ: "o", ợ: "o",
    Ù: "u", Ú: "u", Ủ: "u", Ũ: "u", Ụ: "u", Ư: "u", Ứ: "u", Ừ: "u", Ử: "u", Ữ: "u", Ự: "u",
    Ỳ: "y", Ý: "y", Ỷ: "y", Ỹ: "y", Ỵ: "y", Đ: "d"
  };
  return text
    .split("")
    .map((char) => vietnameseMap[char] || char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function createStory(req, res, next) {
  try {
    const { role, userId } = req.user;
    if (role !== 'author') {
      return res.status(403).json({ success: false, error: 'Chỉ có Tác giả mới được quyền thêm truyện mới.' });
    }

    const { title, categoryIds, coverImage, description, status } = req.body;
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Tiêu đề truyện không được để trống.' });
    }

    const slug = generateSlug(title.trim());
    const slugCheck = await db.query('SELECT id FROM stories WHERE slug = $1', [slug]);
    const finalSlug = slugCheck.rows.length > 0 ? `${slug}-${Math.random().toString(36).substring(2, 7)}` : slug;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const insertStoryQuery = `
        INSERT INTO stories (author_id, title, slug, cover_image, description, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, slug, status, created_at
      `;
      const storyRes = await client.query(insertStoryQuery, [
        userId,
        title.trim(),
        finalSlug,
        coverImage || null,
        description || null,
        status || 'ongoing'
      ]);
      const storyId = storyRes.rows[0].id;

      if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
        const insertCatsQuery = `
          INSERT INTO story_categories (story_id, category_id)
          SELECT $1::uuid, UNNEST($2::uuid[])
        `;
        await client.query(insertCatsQuery, [storyId, categoryIds]);
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, message: 'Tạo truyện mới thành công!', data: storyRes.rows[0] });
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

async function updateStory(req, res, next) {
  try {
    const { role, userId } = req.user;
    const { id } = req.params;

    if (role !== 'author') {
      return res.status(403).json({ success: false, error: 'Chỉ có Tác giả mới được quyền cập nhật truyện.' });
    }

    const storyCheck = await db.query('SELECT author_id, title, slug FROM stories WHERE id = $1', [id]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Truyện không tồn tại.' });
    }
    if (storyCheck.rows[0].author_id !== userId) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền sửa truyện này.' });
    }

    const { title, categoryIds, coverImage, description, status } = req.body;
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Tiêu đề truyện không được để trống.' });
    }

    let finalSlug = storyCheck.rows[0].slug;
    if (title.trim() !== storyCheck.rows[0].title) {
      const slug = generateSlug(title.trim());
      const slugCheck = await db.query('SELECT id FROM stories WHERE slug = $1 AND id <> $2', [slug, id]);
      finalSlug = slugCheck.rows.length > 0 ? `${slug}-${Math.random().toString(36).substring(2, 7)}` : slug;
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const updateStoryQuery = `
        UPDATE stories
        SET title = $1, cover_image = $2, description = $3, status = $4, slug = $5
        WHERE id = $6
        RETURNING id, title, slug, status, updated_at
      `;
      const storyRes = await client.query(updateStoryQuery, [
        title.trim(),
        coverImage || null,
        description || null,
        status || 'ongoing',
        finalSlug,
        id
      ]);

      // Clear old categories
      await client.query('DELETE FROM story_categories WHERE story_id = $1', [id]);

      // Insert new categories
      if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
        const insertCatsQuery = `
          INSERT INTO story_categories (story_id, category_id)
          SELECT $1::uuid, UNNEST($2::uuid[])
        `;
        await client.query(insertCatsQuery, [id, categoryIds]);
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Cập nhật truyện thành công!', data: storyRes.rows[0] });
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

async function getStoryChapters(req, res, next) {
  try {
    const { role, userId } = req.user;
    const { id } = req.params;

    const storyCheck = await db.query(`
      SELECT s.author_id, s.title, s.cover_image, s.description, s.status,
             (
               SELECT COALESCE(json_agg(json_build_object('id', cat.id, 'name', cat.name)), '[]'::json)
               FROM story_categories sc
               JOIN categories cat ON sc.category_id = cat.id
               WHERE sc.story_id = s.id
             ) as categories
      FROM stories s
      WHERE s.id = $1
    `, [id]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Truyện không tồn tại.' });
    }

    if (role === 'author' && storyCheck.rows[0].author_id !== userId) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền truy cập truyện này.' });
    }

    const result = await db.query(
      `SELECT id, chapter_number, title, word_count, view_count, is_published, scheduled_at, created_at, updated_at
       FROM chapters
       WHERE story_id = $1
       ORDER BY chapter_number ASC`,
      [id]
    );

    res.json({ success: true, data: { story: storyCheck.rows[0], chapters: result.rows } });
  } catch (err) {
    next(err);
  }
}

async function getChapter(req, res, next) {
  try {
    const { role, userId } = req.user;
    const { id, chapterId } = req.params;

    const storyCheck = await db.query('SELECT author_id FROM stories WHERE id = $1', [id]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Truyện không tồn tại.' });
    }

    if (role === 'author' && storyCheck.rows[0].author_id !== userId) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền truy cập truyện này.' });
    }

    const result = await db.query(
      `SELECT id, story_id, chapter_number, title, content, is_published, scheduled_at
       FROM chapters
       WHERE id = $1 AND story_id = $2`,
      [chapterId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Chương không tồn tại.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function createChapter(req, res, next) {
  try {
    const { role, userId } = req.user;
    const { id } = req.params;

    if (role !== 'author') {
      return res.status(403).json({ success: false, error: 'Chỉ có Tác giả mới được quyền thêm chương.' });
    }

    const storyCheck = await db.query('SELECT author_id FROM stories WHERE id = $1', [id]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Truyện không tồn tại.' });
    }
    if (storyCheck.rows[0].author_id !== userId) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền thêm chương cho truyện này.' });
    }

    const { title, content, isPublished, scheduledAt } = req.body;
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Tiêu đề chương không được để trống.' });
    }
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Nội dung chương không được để trống.' });
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const numResult = await db.query('SELECT COALESCE(MAX(chapter_number), 0) + 1 AS next_num FROM chapters WHERE story_id = $1', [id]);
    const chapterNumber = numResult.rows[0].next_num;

    const query = `
      INSERT INTO chapters (story_id, chapter_number, title, content, word_count, is_published, scheduled_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, chapter_number, title, is_published, scheduled_at, created_at
    `;
    const result = await db.query(query, [
      id,
      chapterNumber,
      title.trim(),
      content,
      wordCount,
      isPublished !== false,
      scheduledAt ? new Date(scheduledAt) : null
    ]);

    await db.query(
      `UPDATE stories
       SET chapter_count = (SELECT COUNT(*) FROM chapters WHERE story_id = $1)
       WHERE id = $1`,
      [id]
    );

    res.status(201).json({ success: true, message: 'Đăng chương mới thành công!', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function updateChapter(req, res, next) {
  try {
    const { role, userId } = req.user;
    const { id, chapterId } = req.params;

    if (role !== 'author') {
      return res.status(403).json({ success: false, error: 'Chỉ có Tác giả mới được quyền sửa chương.' });
    }

    const storyCheck = await db.query('SELECT author_id FROM stories WHERE id = $1', [id]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Truyện không tồn tại.' });
    }
    if (storyCheck.rows[0].author_id !== userId) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền chỉnh sửa chương của truyện này.' });
    }

    const chapterCheck = await db.query('SELECT id FROM chapters WHERE id = $1 AND story_id = $2', [chapterId, id]);
    if (chapterCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Chương không tồn tại trong truyện này.' });
    }

    const { title, content, isPublished, scheduledAt } = req.body;
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Tiêu đề chương không được để trống.' });
    }
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Nội dung chương không được để trống.' });
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    const query = `
      UPDATE chapters
      SET title = $1, content = $2, word_count = $3, is_published = $4, scheduled_at = $5
      WHERE id = $6 AND story_id = $7
      RETURNING id, chapter_number, title, is_published, scheduled_at, updated_at
    `;
    const result = await db.query(query, [
      title.trim(),
      content,
      wordCount,
      isPublished !== false,
      scheduledAt ? new Date(scheduledAt) : null,
      chapterId,
      id
    ]);

    await db.query(
      `UPDATE stories
       SET chapter_count = (SELECT COUNT(*) FROM chapters WHERE story_id = $1)
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Cập nhật chương thành công!', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteChapter(req, res, next) {
  try {
    const { role, userId } = req.user;
    const { id, chapterId } = req.params;

    if (role !== 'author') {
      return res.status(403).json({ success: false, error: 'Chỉ có Tác giả mới được quyền xóa chương.' });
    }

    const storyCheck = await db.query('SELECT author_id FROM stories WHERE id = $1', [id]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Truyện không tồn tại.' });
    }
    if (storyCheck.rows[0].author_id !== userId) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền xóa chương của truyện này.' });
    }

    const result = await db.query('DELETE FROM chapters WHERE id = $1 AND story_id = $2 RETURNING id, chapter_number', [chapterId, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Chương không tồn tại trong truyện này.' });
    }

    const deletedNum = result.rows[0].chapter_number;
    await db.query(
      `UPDATE chapters
       SET chapter_number = chapter_number - 1
       WHERE story_id = $1 AND chapter_number > $2`,
      [id, deletedNum]
    );

    await db.query(
      `UPDATE stories
       SET chapter_count = (SELECT COUNT(*) FROM chapters WHERE story_id = $1)
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Đã xóa chương thành công!' });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// NOTIFICATIONS
// ============================================================

async function getNotifications(req, res, next) {
  try {
    const { userId } = req.user;
    // We only fetch notifications intended for this author (or user)
    // Here we query where author_id = userId OR user_id = userId (if they receive system notifications)
    const result = await db.query(
      `SELECT id, type, title, message, link, is_read, created_at 
       FROM notifications 
       WHERE author_id = $1 OR user_id = $1
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    const result = await db.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND (author_id = $2 OR user_id = $2)
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Thông báo không tồn tại hoặc không có quyền.' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const { userId } = req.user;

    await db.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE (author_id = $1 OR user_id = $1) AND is_read = false`,
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats, getStories, deleteStory,
  getUsers, toggleBanUser, toggleCommentPermission,
  getCategories, createCategory, deleteCategory,
  getComments, updateCommentStatus, deleteComment,
  getSettings, updateSettings, getMyProfile, updateMyProfile,
  createStory, updateStory, getStoryChapters, createChapter, updateChapter, deleteChapter, getChapter,
  getNotifications, markNotificationRead, markAllNotificationsRead
};
