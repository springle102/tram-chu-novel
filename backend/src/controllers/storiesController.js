// ============================================================
// Trạm Chữ Novel — Stories Controller
// ============================================================
// Chứa business logic cho các API endpoint liên quan đến Stories.
// Tách riêng khỏi routes để dễ test và maintain.
// ============================================================

const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const cache = require("../utils/cache");

function logDebug(message) {
  const logFile = "c:/Users/anhxu/OneDrive/Desktop/tram-chu-novel/backend_debug.log";
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
  } catch (e) {
    console.error("Failed to write to debug log:", e);
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/stories
// ────────────────────────────────────────────────────────────
// ★ API MẪU: Lấy danh sách truyện từ bảng Stories trong Violet_db.
// Sử dụng câu query SQL cơ bản với phân trang (LIMIT/OFFSET).
// Giả định bảng Stories đã tồn tại trong database Violet_db.
// ────────────────────────────────────────────────────────────
async function getAllStories(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { category, search, status } = req.query;

    // Check cache first
    const cacheKey = `stories:list:page:${page}:limit:${limit}:cat:${category || 'all'}:search:${search || ''}:status:${status || ''}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const whereClauses = [];
    const queryValues = [];

    if (category && category !== 'all' && category !== 'Tất cả') {
      queryValues.push(category);
      whereClauses.push(`EXISTS (
        SELECT 1 FROM story_categories sc2
        JOIN categories cat2 ON sc2.category_id = cat2.id
        WHERE sc2.story_id = s.id AND (cat2.slug = $${queryValues.length} OR cat2.name = $${queryValues.length})
      )`);
    }

    if (search) {
      queryValues.push(`%${search}%`);
      whereClauses.push(`(s.title ILIKE $${queryValues.length} OR s.description ILIKE $${queryValues.length} OR a.pen_name ILIKE $${queryValues.length})`);
    }

    if (status) {
      if (['ongoing', 'completed'].includes(status)) {
        queryValues.push(status);
        whereClauses.push(`s.status = $${queryValues.length}`);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const limitIndex = queryValues.length + 1;
    const offsetIndex = queryValues.length + 2;
    queryValues.push(limit, offset);

    const storiesQuery = `
      SELECT
        s.id,
        s.author_id,
        (
          SELECT COALESCE(json_agg(json_build_object('id', cat.id, 'name', cat.name)), '[]'::json)
          FROM story_categories sc
          JOIN categories cat ON sc.category_id = cat.id
          WHERE sc.story_id = s.id
        ) AS categories,
        s.title,
        s.slug,
        s.cover_image,
        s.description,
        s.status,
        s.view_count,
        s.rating,
        s.chapter_count,
        s.created_at,
        s.updated_at,
        a.pen_name AS author_name,
        a.pen_name AS author_display_name
      FROM stories s
      INNER JOIN authors a ON s.author_id = a.id
      ${whereSql}
      ORDER BY s.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const storiesResult = await db.query(storiesQuery, queryValues);

    const countValues = queryValues.slice(0, -2);
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM stories s
      INNER JOIN authors a ON s.author_id = a.id
      ${whereSql}
    `;
    const countResult = await db.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total, 10);

    const responseData = {
      success: true,
      data: {
        stories: storiesResult.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    };

    // Cache the result for 60 seconds (1 minute)
    cache.set(cacheKey, responseData, 60);

    res.json(responseData);
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/stories/latest
// ────────────────────────────────────────────────────────────
// Lấy danh sách truyện mới cập nhật nhất.
// Query params: ?page=1&limit=10
// ORDER BY updated_at DESC sử dụng idx_stories_updated_at_desc
// ────────────────────────────────────────────────────────────
async function getLatestStories(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // Check cache
    const cacheKey = `stories:latest:page:${page}:limit:${limit}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Query 1: Lấy truyện + tên tác giả (JOIN bảng users)
    // ORDER BY updated_at DESC → sử dụng idx_stories_updated_at_desc
    const storiesQuery = `
      SELECT
        s.id,
        s.title,
        s.slug,
        s.cover_image,
        s.rating,
        s.chapter_count,
        s.updated_at,
        a.pen_name AS author_name,
        a.pen_name AS author_display_name,
        (
          SELECT COALESCE(json_agg(json_build_object('id', cat.id, 'name', cat.name)), '[]'::json)
          FROM story_categories sc
          JOIN categories cat ON sc.category_id = cat.id
          WHERE sc.story_id = s.id
        ) AS categories
      FROM stories s
      INNER JOIN authors a ON s.author_id = a.id
      ORDER BY s.updated_at DESC
      LIMIT $1 OFFSET $2
    `;

    // Query 2: Đếm tổng số truyện (cho pagination)
    const countQuery = `SELECT COUNT(*) AS total FROM stories`;

    // Chạy song song 2 query để giảm latency
    const [storiesResult, countResult] = await Promise.all([
      db.query(storiesQuery, [limit, offset]),
      db.query(countQuery),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    const responseData = {
      success: true,
      data: {
        stories: storiesResult.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    };

    // Cache for 60 seconds (1 minute)
    cache.set(cacheKey, responseData, 60);

    res.json(responseData);
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/stories/:slug
// ────────────────────────────────────────────────────────────
// Lấy chi tiết 1 bộ truyện theo slug.
// JOIN users + author_profiles để lấy thông tin tác giả.
// Sử dụng idx_stories_slug → O(log n) lookup.
// ────────────────────────────────────────────────────────────
async function getStoryBySlug(req, res, next) {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== "string") {
      return res.status(400).json({
        success: false,
        error: "Slug không hợp lệ.",
      });
    }

    // Check cache
    const cacheKey = `stories:detail:slug:${slug}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      // Vẫn tăng view_count ở database ngầm ngay cả khi phục vụ từ cache
      db.query(
        `UPDATE stories SET view_count = view_count + 1 WHERE slug = $1`,
        [slug]
      ).catch((err) => {
        console.error("[DB] Failed to increment view_count asynchronously:", err.message);
      });
      return res.json(cachedData);
    }

    const storyQuery = `
      SELECT
        s.id,
        s.title,
        s.slug,
        s.cover_image,
        s.description,
        s.status,
        s.view_count,
        s.rating,
        s.chapter_count,
        s.like_count,
        s.created_at,
        s.updated_at,
        a.id          AS author_id,
        a.pen_name    AS author_username,
        a.avatar_url  AS author_avatar,
        a.pen_name    AS author_display_name,
        a.bio         AS author_bio,
        (
          SELECT COALESCE(json_agg(json_build_object('id', cat.id, 'name', cat.name)), '[]'::json)
          FROM story_categories sc
          JOIN categories cat ON sc.category_id = cat.id
          WHERE sc.story_id = s.id
        ) AS categories
      FROM stories s
      INNER JOIN authors a ON s.author_id = a.id
      WHERE s.slug = $1
    `;

    const result = await db.query(storyQuery, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy truyện.",
      });
    }

    const row = result.rows[0];

    // Cấu trúc response gọn gàng, tách story và author
    const story = {
      id: row.id,
      title: row.title,
      slug: row.slug,
      coverImage: row.cover_image,
      description: row.description,
      status: row.status,
      viewCount: row.view_count,
      rating: row.rating,
      chapterCount: row.chapter_count,
      likeCount: Number(row.like_count) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      categories: row.categories,
      author_id: row.author_id,
      author: {
        id: row.author_id,
        username: row.author_username,
        displayName: row.author_display_name,
        avatar: row.author_avatar,
        bio: row.author_bio,
      },
    };

    // Tăng view_count bất đồng bộ (fire-and-forget)
    // Không cần await — response trả về ngay, view_count cập nhật nền
    db.query(
      `UPDATE stories SET view_count = view_count + 1 WHERE id = $1`,
      [row.id]
    ).catch((err) => {
      console.error("[Stories] Failed to increment view_count:", err.message);
    });

    const responseData = {
      success: true,
      data: story,
    };

    // Cache chi tiết truyện trong 5 phút (300 giây)
    cache.set(cacheKey, responseData, 300);

    res.json(responseData);
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/stories
// ────────────────────────────────────────────────────────────
// Tạo truyện mới. Yêu cầu:
// - Body: { authorId, title, description?, coverImage?, status? }
// - authorId phải là UUID hợp lệ và có role = 'author'
// - title không được rỗng
// - slug tự động sinh từ title
// ────────────────────────────────────────────────────────────
async function createStory(req, res, next) {
  try {
    const { authorId, title, description, coverImage, status, categoryIds } = req.body;

    // ── Validate đầu vào ──
    const errors = [];

    if (!authorId || typeof authorId !== "string") {
      errors.push("authorId là bắt buộc và phải là ID tác giả hợp lệ.");
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      errors.push("title là bắt buộc và không được rỗng.");
    }

    if (title && title.trim().length > 300) {
      errors.push("title không được vượt quá 300 ký tự.");
    }

    if (status && !["ongoing", "completed"].includes(status)) {
      errors.push("status phải là 'ongoing' hoặc 'completed'.");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    // ── Kiểm tra author tồn tại ──
    const authorCheck = await db.query(
      `SELECT id FROM authors WHERE id = $1`,
      [authorId]
    );

    if (authorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy tác giả với ID này.",
      });
    }

    // ── Sinh slug từ title ──
    const slug = generateSlug(title.trim());

    // Kiểm tra slug trùng lặp
    const slugCheck = await db.query(
      `SELECT id FROM stories WHERE slug = $1`,
      [slug]
    );

    // Nếu trùng → thêm suffix UUID ngắn
    const finalSlug =
      slugCheck.rows.length > 0 ? `${slug}-${uuidv4().slice(0, 8)}` : slug;

    // ── INSERT truyện mới ──
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const dbRes = await client.query("SELECT id FROM stories WHERE id LIKE 'NOV%'");
      let nextNum = 1;
      if (dbRes.rows.length > 0) {
        const numbers = dbRes.rows.map(r => parseInt(r.id.replace('NOV', ''), 10)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          nextNum = Math.max(...numbers) + 1;
        }
      }
      const storyId = `NOV${String(nextNum).padStart(2, '0')}`;

      const insertQuery = `
        INSERT INTO stories (id, author_id, title, slug, cover_image, description, status, category_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, title, slug, status, created_at
      `;

      const result = await client.query(insertQuery, [
        storyId,
        authorId,
        title.trim(),
        finalSlug,
        coverImage || null,
        description || null,
        status || "ongoing",
        (categoryIds && categoryIds.length > 0) ? categoryIds[0] : null
      ]);

      if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
        const insertCatsQuery = `
          INSERT INTO story_categories (story_id, category_id)
          SELECT $1::varchar, UNNEST($2::uuid[])
        `;
        await client.query(insertCatsQuery, [storyId, categoryIds]);
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    // Handle unique constraint violation (slug trùng — edge case)
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "Truyện với slug này đã tồn tại. Vui lòng thử tên khác.",
      });
    }
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// HELPER: Sinh slug thân thiện SEO từ tiếng Việt
// ────────────────────────────────────────────────────────────
function generateSlug(text) {
  // Bảng chuyển đổi dấu tiếng Việt
  const vietnameseMap = {
    à: "a", á: "a", ả: "a", ã: "a", ạ: "a",
    ă: "a", ắ: "a", ằ: "a", ẳ: "a", ẵ: "a", ặ: "a",
    â: "a", ấ: "a", ầ: "a", ẩ: "a", ẫ: "a", ậ: "a",
    è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e",
    ê: "e", ế: "e", ề: "e", ể: "e", ễ: "e", ệ: "e",
    ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
    ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o",
    ô: "o", ố: "o", ồ: "o", ổ: "o", ỗ: "o", ộ: "o",
    ơ: "o", ớ: "o", ờ: "o", ở: "o", ỡ: "o", ợ: "o",
    ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u",
    ư: "u", ứ: "u", ừ: "u", ử: "u", ữ: "u", ự: "u",
    ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y",
    đ: "d",
    // Uppercase
    À: "a", Á: "a", Ả: "a", Ã: "a", Ạ: "a",
    Ă: "a", Ắ: "a", Ằ: "a", Ẳ: "a", Ẵ: "a", Ặ: "a",
    Â: "a", Ấ: "a", Ầ: "a", Ẩ: "a", Ẫ: "a", Ậ: "a",
    È: "e", É: "e", Ẻ: "e", Ẽ: "e", Ẹ: "e",
    Ê: "e", Ế: "e", Ề: "e", Ể: "e", Ễ: "e", Ệ: "e",
    Ì: "i", Í: "i", Ỉ: "i", Ĩ: "i", Ị: "i",
    Ò: "o", Ó: "o", Ỏ: "o", Õ: "o", Ọ: "o",
    Ô: "o", Ố: "o", Ồ: "o", Ổ: "o", Ỗ: "o", Ộ: "o",
    Ơ: "o", Ớ: "o", Ờ: "o", Ở: "o", Ỡ: "o", Ợ: "o",
    Ù: "u", Ú: "u", Ủ: "u", Ũ: "u", Ụ: "u",
    Ư: "u", Ứ: "u", Ừ: "u", Ử: "u", Ữ: "u", Ự: "u",
    Ỳ: "y", Ý: "y", Ỷ: "y", Ỹ: "y", Ỵ: "y",
    Đ: "d",
  };

  return text
    .split("")
    .map((char) => vietnameseMap[char] || char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")  // Xóa ký tự đặc biệt
    .replace(/\s+/g, "-")           // Thay space → dash
    .replace(/-+/g, "-")            // Gộp nhiều dash liên tiếp
    .replace(/^-|-$/g, "");         // Trim dash đầu/cuối
}

// ────────────────────────────────────────────────────────────
// GET /api/stories/:slug/chapters
// ────────────────────────────────────────────────────────────
// Lấy danh sách chương của 1 bộ truyện theo slug.
// ────────────────────────────────────────────────────────────
async function getStoryChapters(req, res, next) {
  try {
    const { slug } = req.params;

    const storyCheck = await db.query("SELECT id FROM stories WHERE slug = $1", [slug]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy truyện." });
    }
    const storyId = storyCheck.rows[0].id;

    const chaptersQuery = `
      SELECT id, chapter_number, title, word_count, view_count, created_at
      FROM chapters
      WHERE story_id = $1 AND is_published = true
      ORDER BY chapter_number ASC
    `;
    const result = await db.query(chaptersQuery, [storyId]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/stories/:slug/chapters/:chapterNumber
// ────────────────────────────────────────────────────────────
// Lấy chi tiết chương của truyện theo slug + chapter_number
// ────────────────────────────────────────────────────────────
async function getChapterByNumber(req, res, next) {
  try {
    const { slug, chapterNumber } = req.params;
    const chNum = parseInt(chapterNumber, 10);

    if (isNaN(chNum)) {
      return res.status(400).json({ success: false, error: "Số chương không hợp lệ." });
    }

    const storyCheck = await db.query("SELECT id, title, slug, author_id FROM stories WHERE slug = $1", [slug]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy truyện." });
    }
    const story = storyCheck.rows[0];

    const chapterQuery = `
      SELECT id, chapter_number, title, content, word_count, view_count, created_at
      FROM chapters
      WHERE story_id = $1 AND chapter_number = $2 AND is_published = true
    `;
    const result = await db.query(chapterQuery, [story.id, chNum]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy chương này." });
    }

    const chapter = result.rows[0];

    // Tăng view_count chương nền bất đồng bộ
    db.query("UPDATE chapters SET view_count = view_count + 1 WHERE id = $1", [chapter.id])
      .catch((err) => console.error("[Chapters] Failed to increment view_count:", err.message));

    res.json({
      success: true,
      data: {
        story,
        chapter,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/stories/:slug/comments
// ────────────────────────────────────────────────────────────
// Lấy bình luận của bộ truyện hoặc chương
// ────────────────────────────────────────────────────────────
async function getStoryComments(req, res, next) {
  try {
    const { slug } = req.params;
    const { chapterId, chapterNumber, onlyStory } = req.query;

    const storyCheck = await db.query("SELECT id FROM stories WHERE slug = $1", [slug]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy truyện." });
    }
    const storyId = storyCheck.rows[0].id;

    const queryValues = [storyId];
    let querySql = `
      SELECT 
        c.id, 
        c.user_id,
        c.author_id,
        c.content, 
        c.created_at, 
        c.chapter_id,
        c.parent_id,
        ch.chapter_number,
        ch.title AS chapter_title,
        u.display_name AS user_display_name,
        u.avatar_url AS user_avatar,
        a.pen_name AS author_display_name,
        a.avatar_url AS author_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN authors a ON c.author_id = a.id
      LEFT JOIN chapters ch ON c.chapter_id = ch.id
      WHERE c.story_id = $1 AND c.status = 'approved'
    `;

    if (chapterId) {
      queryValues.push(chapterId);
      querySql += ` AND c.chapter_id = $${queryValues.length}`;
    } else if (chapterNumber) {
      queryValues.push(parseInt(chapterNumber, 10));
      querySql += ` AND ch.chapter_number = $${queryValues.length}`;
    } else if (onlyStory === "true") {
      querySql += ` AND c.chapter_id IS NULL`;
    }

    querySql += ` ORDER BY c.created_at DESC LIMIT 50`;

    const result = await db.query(querySql, queryValues);

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        content: row.content,
        createdAt: row.created_at,
        chapterId: row.chapter_id,
        parentId: row.parent_id,
        chapterNumber: row.chapter_number,
        chapterTitle: row.chapter_title,
        userId: row.user_id,
        authorId: row.author_id,
        commenter: row.user_display_name 
          ? { name: row.user_display_name, avatar: row.user_avatar, isAuthor: false, role: 'reader' }
          : row.author_display_name
          ? { name: row.author_display_name, avatar: row.author_avatar, isAuthor: true, role: 'author' }
          : { name: "Ẩn danh", avatar: null, isAuthor: false, role: 'reader' },
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/stories/:slug/comments
// ────────────────────────────────────────────────────────────
// Tạo bình luận mới cho bộ truyện hoặc chương (Đã đăng nhập)
// ────────────────────────────────────────────────────────────
async function createStoryComment(req, res, next) {
  try {
    const { slug } = req.params;
    const { content, chapterId, parentId } = req.body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Nội dung bình luận không được để trống." });
    }

    const storyCheck = await db.query("SELECT id, title, author_id FROM stories WHERE slug = $1", [slug]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy truyện." });
    }
    const { id: storyId, title: storyTitle, author_id: storyAuthorId } = storyCheck.rows[0];

    const isAuthor = req.user.role === "author";
    const userIdCol = isAuthor ? null : req.user.userId;
    const authorIdCol = isAuthor ? req.user.userId : null;

    const insertQuery = `
      INSERT INTO comments (user_id, author_id, story_id, chapter_id, parent_id, content, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'approved')
      RETURNING id, content, created_at, chapter_id, parent_id
    `;
    const result = await db.query(insertQuery, [
      userIdCol,
      authorIdCol,
      storyId,
      chapterId || null,
      parentId || null,
      content.trim(),
    ]);

    // Lấy thông tin người bình luận để trả về đồng bộ
    let commenterInfo = { name: "Ẩn danh", avatar: null, isAuthor };
    if (isAuthor) {
      const authQuery = await db.query("SELECT pen_name, avatar_url FROM authors WHERE id = $1", [req.user.userId]);
      if (authQuery.rows.length > 0) {
        commenterInfo = { name: authQuery.rows[0].pen_name, avatar: authQuery.rows[0].avatar_url, isAuthor: true };
      }
    } else {
      const userQuery = await db.query("SELECT display_name, username, avatar_url FROM users WHERE id = $1", [req.user.userId]);
      if (userQuery.rows.length > 0) {
        const uRow = userQuery.rows[0];
        commenterInfo = { name: uRow.display_name || uRow.username || "Ẩn danh", avatar: uRow.avatar_url, isAuthor: false };
      }
    }

    // Gửi thông báo bất đồng bộ để tránh làm chậm response của user
    (async () => {
      try {
        logDebug(`[COMMENT] Bắt đầu xử lý gửi thông báo. Commenter: ${req.user.userId}, Role: ${req.user.role}, Story: "${storyTitle}" (ID: ${storyId}), Author: ${storyAuthorId}`);
        const commenterName = commenterInfo.name;
        const truncatedContent = content.trim().substring(0, 60) + (content.trim().length > 60 ? "..." : "");

        let chapterNumber = null;
        if (chapterId) {
          logDebug(`[COMMENT] Truy vấn chapter_number cho chapterId: ${chapterId}`);
          const chapterCheck = await db.query("SELECT chapter_number FROM chapters WHERE id = $1", [chapterId]);
          if (chapterCheck.rows.length > 0) {
            chapterNumber = chapterCheck.rows[0].chapter_number;
            logDebug(`[COMMENT] Tìm thấy chapter_number: ${chapterNumber}`);
          }
        }
        const link = chapterNumber !== null ? `/stories/${slug}/${chapterNumber}` : `/stories/${slug}`;

        if (parentId) {
          logDebug(`[COMMENT] Bình luận là phản hồi (parentId: ${parentId})`);
          // Là trả lời bình luận
          const parentCommentRes = await db.query(
            "SELECT user_id, author_id FROM comments WHERE id = $1",
            [parentId]
          );
          if (parentCommentRes.rows.length > 0) {
            const parentComment = parentCommentRes.rows[0];
            const parentUserId = parentComment.user_id;
            const parentAuthorId = parentComment.author_id;

            logDebug(`[COMMENT] Chủ bình luận gốc - User: ${parentUserId}, Author: ${parentAuthorId}`);

            // Gửi thông báo cho chủ bình luận gốc nếu không tự trả lời chính mình
            if (parentUserId && parentUserId !== req.user.userId) {
              logDebug(`[COMMENT] Tạo thông báo comment_reply cho Độc giả: ${parentUserId}`);
              const resNotif = await db.query(
                `INSERT INTO notifications (user_id, author_id, type, title, message, link)
                 VALUES ($1, NULL, 'comment_reply', $2, $3, $4) RETURNING id`,
                [
                  parentUserId,
                  "Có người phản hồi bình luận của bạn",
                  `${commenterName} đã trả lời bình luận của bạn: "${truncatedContent}"`,
                  link
                ]
              );
              logDebug(`[COMMENT] ✓ Đã lưu thông báo ID: ${resNotif.rows[0].id}`);
            } else if (parentAuthorId && parentAuthorId !== req.user.userId) {
              logDebug(`[COMMENT] Tạo thông báo comment_reply cho Tác giả: ${parentAuthorId}`);
              const resNotif = await db.query(
                `INSERT INTO notifications (user_id, author_id, type, title, message, link)
                 VALUES (NULL, $1, 'comment_reply', $2, $3, $4) RETURNING id`,
                [
                  parentAuthorId,
                  "Có người phản hồi bình luận của bạn",
                  `${commenterName} đã trả lời bình luận của bạn: "${truncatedContent}"`,
                  `/admin/comments?slug=${slug}`
                ]
              );
              logDebug(`[COMMENT] ✓ Đã lưu thông báo ID: ${resNotif.rows[0].id}`);
            }

            // Gửi thông báo cho tác giả nếu chủ bình luận gốc không phải là tác giả và người phản hồi cũng không phải tác giả
            const parentIsAuthor = parentAuthorId === storyAuthorId;
            const currentIsAuthor = req.user.userId === storyAuthorId && req.user.role === 'author';

            if (!parentIsAuthor && !currentIsAuthor) {
              logDebug(`[COMMENT] Tạo thông báo new_comment cho Tác giả bộ truyện: ${storyAuthorId}`);
              const resNotif = await db.query(
                `INSERT INTO notifications (user_id, author_id, type, title, message, link)
                 VALUES (NULL, $1, 'new_comment', $2, $3, $4) RETURNING id`,
                [
                  storyAuthorId,
                  `Bình luận mới trên truyện ${storyTitle}`,
                  `${commenterName} đã bình luận: "${truncatedContent}"`,
                  `/admin/comments?slug=${slug}`
                ]
              );
              logDebug(`[COMMENT] ✓ Đã lưu thông báo ID: ${resNotif.rows[0].id}`);
            }
          }
        } else {
          logDebug(`[COMMENT] Bình luận cấp 1 (Không có parentId)`);
          // Bình luận cấp 1: Thông báo cho tác giả nếu không phải tác giả tự bình luận truyện mình
          const currentIsAuthor = req.user.userId === storyAuthorId && req.user.role === 'author';
          logDebug(`[COMMENT] Người bình luận có phải tác giả truyện không? ${currentIsAuthor} (Commenter: ${req.user.userId}, Author: ${storyAuthorId})`);
          if (!currentIsAuthor) {
            logDebug(`[COMMENT] Tạo thông báo new_comment cho Tác giả bộ truyện: ${storyAuthorId}`);
            const resNotif = await db.query(
              `INSERT INTO notifications (user_id, author_id, type, title, message, link)
               VALUES (NULL, $1, 'new_comment', $2, $3, $4) RETURNING id`,
              [
                storyAuthorId,
                `Bình luận mới trên truyện ${storyTitle}`,
                `${commenterName} đã bình luận: "${truncatedContent}"`,
                `/admin/comments?slug=${slug}`
              ]
            );
            logDebug(`[COMMENT] ✓ Đã lưu thông báo ID: ${resNotif.rows[0].id}`);
          }
        }
      } catch (notifErr) {
        logDebug(`[COMMENT] ❌ Lỗi tạo thông báo: ${notifErr.message}\n${notifErr.stack}`);
        console.error("[Notifications] Failed to create notification:", notifErr);
      }
    })();

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        content: row.content,
        createdAt: row.created_at,
        chapterId: row.chapter_id,
        parentId: row.parent_id,
        userId: userIdCol,
        authorId: authorIdCol,
        commenter: {
          ...commenterInfo,
          role: isAuthor ? 'author' : 'reader'
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/stories/:slug/interact
// ────────────────────────────────────────────────────────────
// Kiểm tra trạng thái lưu truyện và chấm điểm của độc giả (Đã đăng nhập)
// ────────────────────────────────────────────────────────────
async function checkStoryInteraction(req, res, next) {
  try {
    const { slug } = req.params;
    const userId = req.user.userId;

    const storyCheck = await db.query("SELECT id FROM stories WHERE slug = $1", [slug]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy truyện." });
    }
    const storyId = storyCheck.rows[0].id;

    const bookmarkCheck = await db.query(
      "SELECT 1 FROM bookmarks WHERE user_id = $1 AND story_id = $2",
      [userId, storyId]
    );

    const likeCheck = await db.query(
      "SELECT 1 FROM likes WHERE user_id = $1 AND story_id = $2",
      [userId, storyId]
    );

    const ratingCheck = await db.query(
      "SELECT score FROM ratings WHERE user_id = $1 AND story_id = $2",
      [userId, storyId]
    );

    res.json({
      success: true,
      data: {
        bookmarked: bookmarkCheck.rows.length > 0,
        liked: likeCheck.rows.length > 0,
        ratingScore: ratingCheck.rows.length > 0 ? ratingCheck.rows[0].score : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/stories/:slug/bookmark
// ────────────────────────────────────────────────────────────
// Lưu hoặc Hủy lưu truyện (Đã đăng nhập)
// ────────────────────────────────────────────────────────────
async function toggleStoryBookmark(req, res, next) {
  try {
    const { slug } = req.params;
    const userId = req.user.userId;

    const storyCheck = await db.query("SELECT id, title, author_id FROM stories WHERE slug = $1", [slug]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy truyện." });
    }
    const { id: storyId, title: storyTitle, author_id: storyAuthorId } = storyCheck.rows[0];

    const bookmarkCheck = await db.query(
      "SELECT id FROM bookmarks WHERE user_id = $1 AND story_id = $2",
      [userId, storyId]
    );

    let bookmarked = false;
    if (bookmarkCheck.rows.length > 0) {
      await db.query("DELETE FROM bookmarks WHERE user_id = $1 AND story_id = $2", [userId, storyId]);
    } else {
      await db.query("INSERT INTO bookmarks (user_id, story_id) VALUES ($1, $2)", [userId, storyId]);
      bookmarked = true;

      // Gửi thông báo cho tác giả nếu không tự lưu truyện của mình
      if (storyAuthorId && storyAuthorId !== userId) {
        try {
          const userRes = await db.query("SELECT username, display_name FROM users WHERE id = $1", [userId]);
          const commenterName = userRes.rows.length > 0 ? (userRes.rows[0].display_name || userRes.rows[0].username) : "Độc giả";
          
          await db.query(
            `INSERT INTO notifications (user_id, author_id, type, title, message, link)
             VALUES (NULL, $1, 'new_bookmark', $2, $3, $4)`,
            [
              storyAuthorId,
              "Lượt lưu truyện mới",
              `Độc giả ${commenterName} đã lưu truyện "${storyTitle}" vào tủ sách`,
              `/admin/stories?slug=${slug}`
            ]
          );
        } catch (notifErr) {
          console.error("[Notifications] Failed to create bookmark notification:", notifErr);
        }
      }
    }

    res.json({
      success: true,
      data: {
        bookmarked,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/stories/:slug/like
// ────────────────────────────────────────────────────────────
// Yêu thích hoặc Hủy yêu thích truyện (Đã đăng nhập)
// ────────────────────────────────────────────────────────────
async function toggleStoryLike(req, res, next) {
  try {
    const { slug } = req.params;
    const userId = req.user.userId;

    const storyCheck = await db.query("SELECT id, title, author_id FROM stories WHERE slug = $1", [slug]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy truyện." });
    }
    const { id: storyId, title: storyTitle, author_id: storyAuthorId } = storyCheck.rows[0];

    const likeCheck = await db.query(
      "SELECT id FROM likes WHERE user_id = $1 AND story_id = $2",
      [userId, storyId]
    );

    let liked = false;
    if (likeCheck.rows.length > 0) {
      await db.query("DELETE FROM likes WHERE user_id = $1 AND story_id = $2", [userId, storyId]);
    } else {
      await db.query("INSERT INTO likes (user_id, story_id) VALUES ($1, $2)", [userId, storyId]);
      liked = true;

      // Gửi thông báo cho tác giả nếu không tự thích truyện của mình
      if (storyAuthorId && storyAuthorId !== userId) {
        try {
          const userRes = await db.query("SELECT username, display_name FROM users WHERE id = $1", [userId]);
          const commenterName = userRes.rows.length > 0 ? (userRes.rows[0].display_name || userRes.rows[0].username) : "Độc giả";
          
          await db.query(
            `INSERT INTO notifications (user_id, author_id, type, title, message, link)
             VALUES (NULL, $1, 'new_like', $2, $3, $4)`,
            [
              storyAuthorId,
              "Lượt yêu thích mới",
              `Độc giả ${commenterName} đã thích truyện "${storyTitle}"`,
              `/admin/stories?slug=${slug}`
            ]
          );
        } catch (notifErr) {
          console.error("[Notifications] Failed to create like notification:", notifErr);
        }
      }
    }

    // Tính toán lại tổng lượt thích
    const countRes = await db.query("SELECT COUNT(*) AS count FROM likes WHERE story_id = $1", [storyId]);
    const count = parseInt(countRes.rows[0].count, 10);
    await db.query("UPDATE stories SET like_count = $1 WHERE id = $2", [count, storyId]);

    res.json({
      success: true,
      data: {
        liked,
        likeCount: count,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/stories/:slug/rate
// ────────────────────────────────────────────────────────────
// Đánh giá truyện từ 1-5 sao và cập nhật lại điểm TB của truyện (Đã đăng nhập)
// ────────────────────────────────────────────────────────────
async function rateStory(req, res, next) {
  try {
    const { slug } = req.params;
    const { score } = req.body;
    const userId = req.user.userId;

    const starScore = parseInt(score, 10);
    if (isNaN(starScore) || starScore < 1 || starScore > 5) {
      return res.status(400).json({ success: false, error: "Điểm đánh giá phải từ 1 đến 5 sao." });
    }

    const storyCheck = await db.query("SELECT id, title, author_id FROM stories WHERE slug = $1", [slug]);
    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy truyện." });
    }
    const { id: storyId, title: storyTitle, author_id: storyAuthorId } = storyCheck.rows[0];

    // INSERT hoặc UPDATE trên uq_ratings_user_story
    await db.query(
      `INSERT INTO ratings (user_id, story_id, score) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, story_id) 
       DO UPDATE SET score = EXCLUDED.score`,
      [userId, storyId, starScore]
    );

    // Tính lại điểm trung bình
    const updatedRes = await db.query(
      `UPDATE stories 
       SET rating = (SELECT ROUND(AVG(score), 1) FROM ratings WHERE story_id = $1)
       WHERE id = $1
       RETURNING rating`,
      [storyId]
    );

    // Gửi thông báo cho tác giả nếu không tự đánh giá truyện của mình
    if (storyAuthorId && storyAuthorId !== userId) {
      try {
        const userRes = await db.query("SELECT username, display_name FROM users WHERE id = $1", [userId]);
        const commenterName = userRes.rows.length > 0 ? (userRes.rows[0].display_name || userRes.rows[0].username) : "Độc giả";
        
        await db.query(
          `INSERT INTO notifications (user_id, author_id, type, title, message, link)
           VALUES (NULL, $1, 'new_rating', $2, $3, $4)`,
          [
            storyAuthorId,
            "Đánh giá truyện mới",
            `Độc giả ${commenterName} đã đánh giá ${starScore} sao cho truyện "${storyTitle}"`,
            `/admin/stories?slug=${slug}`
          ]
        );
      } catch (notifErr) {
        console.error("[Notifications] Failed to create rating notification:", notifErr);
      }
    }

    res.json({
      success: true,
      data: {
        rating: Number(updatedRes.rows[0].rating) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// GET /api/stories/bookmarked
// ────────────────────────────────────────────────────────────
// Lấy danh sách các truyện đã lưu trong tủ sách của độc giả (Đã đăng nhập)
// ────────────────────────────────────────────────────────────
async function getBookmarkedStories(req, res, next) {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const storiesQuery = `
      SELECT
        s.id,
        s.author_id,
        (
          SELECT COALESCE(json_agg(json_build_object('id', cat.id, 'name', cat.name)), '[]'::json)
          FROM story_categories sc
          JOIN categories cat ON sc.category_id = cat.id
          WHERE sc.story_id = s.id
        ) AS categories,
        s.title,
        s.slug,
        s.cover_image,
        s.description,
        s.status,
        s.view_count,
        s.rating,
        s.chapter_count,
        s.like_count,
        s.created_at,
        s.updated_at,
        a.pen_name AS author_name,
        a.pen_name AS author_display_name
      FROM stories s
      INNER JOIN bookmarks b ON s.id = b.story_id
      INNER JOIN authors a ON s.author_id = a.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM bookmarks b
      WHERE b.user_id = $1
    `;

    const [storiesResult, countResult] = await Promise.all([
      db.query(storiesQuery, [userId, limit, offset]),
      db.query(countQuery, [userId])
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    res.json({
      success: true,
      data: {
        stories: storiesResult.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllStories,
  getLatestStories,
  getStoryBySlug,
  createStory,
  getStoryChapters,
  getChapterByNumber,
  getStoryComments,
  createStoryComment,
  checkStoryInteraction,
  toggleStoryBookmark,
  toggleStoryLike,
  rateStory,
  getBookmarkedStories,
};
