// ============================================================
// Trạm Chữ Novel — Image Upload Controller
// ============================================================
// Hỗ trợ tải ảnh bìa lên Cloudinary (Free tier, không cần credit card)
// và trả về URL ngắn thay thế cho dữ liệu Base64.
// ============================================================

const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Cấu hình Cloudinary. SDK sẽ tự động sử dụng biến CLOUDINARY_URL trong .env nếu có.
// Hoặc có thể khai báo chi tiết qua biến môi trường.
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
}

/**
 * Xử lý tải ảnh bìa lên Cloudinary với tự động tối ưu hóa
 * POST /api/admin/upload
 */
async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "Vui lòng chọn một tập tin ảnh để tải lên." });
    }

    const file = req.file;

    // 1. Kiểm tra dung lượng (giới hạn 2MB)
    const maxFileSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxFileSize) {
      // Xóa file tạm
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, error: "Kích thước tập tin ảnh vượt quá giới hạn cho phép (Tối đa 2MB)." });
    }

    // 2. Kiểm tra định dạng đuôi ảnh
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      // Xóa file tạm
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, error: "Định dạng ảnh không hợp lệ. Chỉ chấp nhận các tệp tin JPG, PNG hoặc WEBP." });
    }

    // 3. Upload lên Cloudinary
    console.log(`[Cloudinary] Đang tải ảnh từ ${file.path} lên Cloudinary...`);
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "tram_chu_novel_covers",
      // Tự động resize ảnh về tỷ lệ chuẩn 400x600 để tối ưu dung lượng và hiển thị ở frontend
      transformation: [
        { width: 400, height: 600, crop: "fill", gravity: "center", quality: "auto", fetch_format: "auto" }
      ]
    });

    // 4. Xóa tệp tạm ở local
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    console.log(`[Cloudinary] Tải ảnh lên thành công. URL: ${result.secure_url}`);
    return res.json({
      success: true,
      url: result.secure_url,
    });

  } catch (err) {
    // Luôn dọn dẹp file tạm khi có lỗi xảy ra
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error("[Multer] Failed to delete temp file:", unlinkErr.message);
      }
    }
    console.error("[Cloudinary] Upload error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Không thể upload ảnh lên Cloudinary: " + err.message,
    });
  }
}

module.exports = {
  uploadImage,
};
