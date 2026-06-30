const { Router } = require("express");
const { verifyToken } = require("../middleware/adminAuth");
const reportsController = require("../controllers/reportsController");

const router = Router();

// POST /api/reports - Tạo báo lỗi mới
router.post("/", verifyToken, reportsController.createReport);

// GET /api/reports/my-reports - Lấy danh sách báo lỗi của tôi
router.get("/my-reports", verifyToken, reportsController.getMyReports);

module.exports = router;
