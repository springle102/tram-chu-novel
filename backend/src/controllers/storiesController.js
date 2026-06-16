// ============================================================
// Novel Violet — Stories Controller
// ============================================================
// Chứa business logic cho các API endpoint liên quan đến Stories.
// Tách riêng khỏi routes để dễ test và maintain.
// ============================================================

const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

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

    // Query cơ bản: lấy danh sách truyện kèm tên tác giả, sắp xếp theo ngày tạo
    const storiesResult = await db.query(
      `SELECT
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
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // In ra các hàng bốc được từ DB để debug
    console.log("[GET-ALL-STORIES] Rows bốc được từ DB:", storiesResult.rows);

    // Đếm tổng số truyện để tính pagination
    const countResult = await db.query(`SELECT COUNT(*) AS total FROM stories`);
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

// ────────────────────────────────────────────────────────────
// GET /api/stories/latest
// ────────────────────────────────────────────────────────────
// Lấy danh sách truyện mới cập nhật nhất.
// Query params: ?page=1&limit=10
// Sử dụng covering index idx_stories_latest_covering → Index-Only Scan
// ────────────────────────────────────────────────────────────
async function getLatestStories(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

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

    res.json({
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
    });
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      categories: row.categories,
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

    res.json({
      success: true,
      data: story,
    });
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
      errors.push("authorId là bắt buộc và phải là UUID hợp lệ.");
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
    const storyId = uuidv4();
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const insertQuery = `
        INSERT INTO stories (id, author_id, title, slug, cover_image, description, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
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
      ]);

      if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
        const insertCatsQuery = `
          INSERT INTO story_categories (story_id, category_id)
          SELECT $1::uuid, UNNEST($2::uuid[])
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

module.exports = {
  getAllStories,
  getLatestStories,
  getStoryBySlug,
  createStory,
};
