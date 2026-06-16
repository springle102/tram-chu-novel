// ============================================================
// Novel Violet — Admin Routes
// ============================================================
// Định tuyến API cho admin panel.
// Tất cả routes yêu cầu xác thực JWT + quyền author hoặc admin.
// Một số routes chỉ dành riêng cho admin (requireAdmin).
// ============================================================

const { Router } = require('express');
const { verifyToken, requireAdmin, verifyAdmin, requireAuthorOrAdmin } = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');
const adminAuthController = require('../controllers/adminAuthController');

const router = Router();

// ── Public admin route ──
// POST /api/admin/login
router.post('/login', adminAuthController.login);

// All other admin routes require authentication
router.use(verifyToken);
router.use(requireAuthorOrAdmin);

// ── Dashboard (admin + author) ──
router.get('/dashboard', adminController.getDashboardStats);

// ── Profile (admin + author) ──
router.get('/profile', adminController.getMyProfile);
router.put('/profile', adminController.updateMyProfile);

// ── Stories (admin sees all, author sees own, author can add/edit) ──
router.get('/stories', adminController.getStories);
router.post('/stories', adminController.createStory);
router.put('/stories/:id', adminController.updateStory);
router.delete('/stories/:id', adminController.deleteStory);

// ── Chapters (author manages, admin/author views) ──
router.get('/stories/:id/chapters', adminController.getStoryChapters);
router.post('/stories/:id/chapters', adminController.createChapter);
router.get('/stories/:id/chapters/:chapterId', adminController.getChapter);
router.put('/stories/:id/chapters/:chapterId', adminController.updateChapter);
router.delete('/stories/:id/chapters/:chapterId', adminController.deleteChapter);

// ── Users (admin only) ──
router.get('/users', requireAdmin, adminController.getUsers);
router.patch('/users/:id/ban', requireAdmin, adminController.toggleBanUser);
router.patch('/users/:id/comment-permission', requireAdmin, adminController.toggleCommentPermission);

// ── Categories (admin only for create/delete) ──
router.get('/categories', adminController.getCategories);
router.post('/categories', requireAdmin, adminController.createCategory);
router.delete('/categories/:id', requireAdmin, adminController.deleteCategory);

// ── Comments (admin + author view, admin edit) ──
router.get('/comments', adminController.getComments);
router.patch('/comments/:id', requireAdmin, adminController.updateCommentStatus);
router.delete('/comments/:id', requireAdmin, adminController.deleteComment);

// ── Settings (admin + author view, admin edit) ──
router.get('/settings', adminController.getSettings);
router.put('/settings', requireAdmin, adminController.updateSettings);

// ── Notifications ──
router.get('/notifications', adminController.getNotifications);
router.put('/notifications/read-all', adminController.markAllNotificationsRead);
router.put('/notifications/:id/read', adminController.markNotificationRead);

module.exports = router;
