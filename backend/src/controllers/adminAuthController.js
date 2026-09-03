const jwt = require("jsonwebtoken");
const db = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_ME_IN_PRODUCTION";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// POST /api/admin/login
async function login(req, res, next) {
  console.log("\n[ADMIN-AUTH-LOGIN] >>> Nhận yêu cầu đăng nhập Admin/Tác giả mới");
  console.log("[ADMIN-AUTH-LOGIN] Email:", req.body.email);

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.warn("[ADMIN-AUTH-LOGIN] Thiếu Email hoặc Mật khẩu");
      return res.status(400).json({ success: false, error: "Email và mật khẩu là bắt buộc." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Ưu tiên tìm trong bảng admins, sau đó tìm trong bảng authors.
    // Cổng này chỉ dành cho hai role quản trị; tài khoản độc giả vẫn dùng /api/auth/login.
    const adminQuery = `
      SELECT id, username, email, password, avatar_url, created_at
      FROM admins
      WHERE LOWER(email) = $1 OR LOWER(username) = $1
    `;
    const adminResult = await db.query(adminQuery, [normalizedEmail]);
    let account = adminResult.rows[0] ? { ...adminResult.rows[0], role: "admin" } : null;

    if (!account) {
      const authorResult = await db.query(
        `
          SELECT id, pen_name AS username, email, password, avatar_url, created_at, is_banned
          FROM authors
          WHERE LOWER(email) = $1 OR LOWER(pen_name) = $1
        `,
        [normalizedEmail]
      );

      if (authorResult.rows[0]) {
        account = { ...authorResult.rows[0], role: "author" };
      }
    }

    if (!account) {
      console.warn(`[ADMIN-AUTH-LOGIN] Không tìm thấy tài khoản quản trị: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        error: "Email hoặc mật khẩu không chính xác.",
      });
    }

    // So sánh mật khẩu dạng plain text
    const isPasswordValid = password === account.password;
    if (!isPasswordValid) {
      console.warn(`[ADMIN-AUTH-LOGIN] Sai mật khẩu cho ${account.role}: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        error: "Email hoặc mật khẩu không chính xác.",
      });
    }

    if (account.role === "author" && account.is_banned) {
      return res.status(403).json({
        success: false,
        error: "Tài khoản của bạn đã bị khóa.",
      });
    }

    // Cập nhật thời điểm đăng nhập cho đúng bảng tài khoản.
    const accountTable = account.role === "admin" ? "admins" : "authors";
    await db.query(`UPDATE ${accountTable} SET last_login_at = NOW() WHERE id = $1`, [account.id]);

    // Tạo JWT Token với role thực tế để dashboard và middleware tự phân quyền.
    const tokenPayload = {
      id: account.id,
      userId: account.id,
      email: account.email,
      role: account.role,
    };

    console.log("[ADMIN-AUTH-LOGIN] Đang tạo JWT token...");
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "novel-violet",
      subject: account.id,
    });
    console.log(`[ADMIN-AUTH-LOGIN] ✓ Đăng nhập ${account.role} thành công`);

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công!",
      data: {
        token,
        user: {
          id: account.id,
          fullName: account.username,
          displayName: account.username,
          username: account.username,
          email: account.email,
          role: account.role,
          avatarUrl: account.avatar_url,
          createdAt: account.created_at,
        },
      },
    });
  } catch (err) {
    console.error("[ADMIN-AUTH-LOGIN] ❌ Lỗi đăng nhập Admin:", err);
    next(err);
  }
}

module.exports = { login };
