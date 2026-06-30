// ============================================================
// Trạm Chữ Novel — Stories Routes
// ============================================================
// Định nghĩa các route cho resource /api/stories
// Mỗi route map tới 1 controller function tương ứng.
// ============================================================

const { Router } = require("express");
const storiesController = require("../controllers/storiesController");
const { verifyToken } = require("../middleware/adminAuth");

const router = Router();

// GET /api/stories?page=1&limit=20
// ★ API mẫu: Lấy danh sách tất cả truyện từ bảng Stories (có phân trang)
router.get("/", storiesController.getAllStories);

// GET /api/stories/latest?page=1&limit=10
// Lấy danh sách truyện mới cập nhật nhất (có phân trang)
router.get("/latest", storiesController.getLatestStories);

// GET /api/stories/bookmarked
// Lấy danh sách truyện đã lưu của độc giả (Đã đăng nhập)
router.get("/bookmarked", verifyToken, storiesController.getBookmarkedStories);

// ── Các Route Tương Tác Của Độc Giả ──

// GET /api/stories/:slug/chapters
// Lấy danh sách chương của truyện
router.get("/:slug/chapters", storiesController.getStoryChapters);

// GET /api/stories/:slug/chapters/:chapterNumber
// Lấy chi tiết chương theo số chương
router.get("/:slug/chapters/:chapterNumber", storiesController.getChapterByNumber);

// GET /api/stories/:slug/comments
// Lấy bình luận của truyện/chương
router.get("/:slug/comments", storiesController.getStoryComments);

// POST /api/stories/:slug/comments
// Gửi bình luận truyện/chương
router.post("/:slug/comments", verifyToken, storiesController.createStoryComment);

// GET /api/stories/:slug/interact
// Kiểm tra trạng thái tương tác của user (bookmark, rating)
router.get("/:slug/interact", verifyToken, storiesController.checkStoryInteraction);

// POST /api/stories/:slug/bookmark
// Toggle bookmark
router.post("/:slug/bookmark", verifyToken, storiesController.toggleStoryBookmark);

// POST /api/stories/:slug/like
// Toggle like
router.post("/:slug/like", verifyToken, storiesController.toggleStoryLike);

// POST /api/stories/:slug/rate
// Đánh giá sao truyện
router.post("/:slug/rate", verifyToken, storiesController.rateStory);

// GET /api/stories/:slug
// Lấy chi tiết truyện theo slug
// ⚠️ Route này đặt ở cuối nhóm :slug để tránh match nhầm các path cụ thể khác
router.get("/:slug", storiesController.getStoryBySlug);

// POST /api/stories
// Tạo truyện mới (yêu cầu authorId trong body)
router.post("/", storiesController.createStory);

module.exports = router;
