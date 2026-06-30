const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db = require("../config/db");

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_ME_IN_PRODUCTION";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// ── ĐĂNG KÝ ──
// ── ĐĂNG KÝ ──
async function register(req, res, next) {
  console.log("\n[AUTH-REGISTER] >>> Nhận yêu cầu đăng ký mới");
  console.log("[AUTH-REGISTER] Body nhận được:", {
    fullName: req.body.fullName,
    email: req.body.email,
    role: req.body.role,
    passwordLength: req.body.password ? req.body.password.length : 0
  });

  try {
    const { fullName, email, password, role, username } = req.body;

    // 1. Validation
    const errors = [];
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      errors.push("Họ tên là bắt buộc và phải có ít nhất 2 ký tự.");
    }
    if (role === 'reader') {
      if (!username || typeof username !== "string" || !/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
        errors.push("Username chỉ chứa chữ cái, số, dấu gạch dưới và dài từ 3-30 ký tự.");
      }
    }
    if (!email || typeof email !== "string") {
      errors.push("Email là bắt buộc.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Email không hợp lệ.");
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      errors.push("Mật khẩu là bắt buộc và phải có ít nhất 6 ký tự.");
    }
    if (!role || !["reader", "author"].includes(role)) {
      errors.push("Role phải là 'reader' hoặc 'author'.");
    }

    if (errors.length > 0) {
      console.warn("[AUTH-REGISTER] Validation thất bại:", errors);
      return res.status(400).json({ success: false, errors });
    }

    // 2. Kiểm tra trùng lặp email ở cả hai bảng
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[AUTH-REGISTER] Đang kiểm tra trùng lặp email: ${normalizedEmail}`);

    const existingUser = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [normalizedEmail]
    );
    const existingAuthor = await db.query(
      `SELECT id FROM authors WHERE email = $1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0 || existingAuthor.rows.length > 0) {
      console.warn(`[AUTH-REGISTER] Trùng lặp email: ${normalizedEmail}`);
      return res.status(409).json({
        success: false,
        error: "Email này đã được sử dụng. Vui lòng dùng email khác.",
      });
    }

    // Kiểm tra trùng lặp username độc giả
    if (role === 'reader') {
      const normalizedUsername = username.trim().toLowerCase();
      const existingUsername = await db.query(
        `SELECT id FROM users WHERE LOWER(username) = $1`,
        [normalizedUsername]
      );
      if (existingUsername.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Username này đã tồn tại. Vui lòng chọn username khác."
        });
      }
    }

    // 3. Lưu mật khẩu trực tiếp dạng plain text
    console.log("[AUTH-REGISTER] Bỏ qua băm password, lưu dạng plain text...");

    let userId;
    if (role === 'author') {
      const dbRes = await db.query("SELECT id FROM authors WHERE id LIKE 'AU%'");
      let nextNum = 1;
      if (dbRes.rows.length > 0) {
        const numbers = dbRes.rows.map(r => parseInt(r.id.replace('AU', ''), 10)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          nextNum = Math.max(...numbers) + 1;
        }
      }
      userId = `AU${String(nextNum).padStart(2, '0')}`;
    } else {
      const dbRes = await db.query("SELECT id FROM users WHERE id LIKE 'RD%'");
      let nextNum = 1;
      if (dbRes.rows.length > 0) {
        const numbers = dbRes.rows.map(r => parseInt(r.id.replace('RD', ''), 10)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          nextNum = Math.max(...numbers) + 1;
        }
      }
      userId = `RD${nextNum}`;
    }

    let result;

    if (role === 'author') {
      const insertQuery = `
        INSERT INTO authors (id, pen_name, email, password)
        VALUES ($1, $2, $3, $4)
        RETURNING id, pen_name AS "fullName", email, 'author'::text as role, created_at
      `;
      console.log(`[AUTH-REGISTER] Đang lưu Author mới vào Database (ID: ${userId})`);
      result = await db.query(insertQuery, [
        userId,
        fullName.trim(),
        normalizedEmail,
        password
      ]);
    } else {
      const insertQuery = `
        INSERT INTO users (id, username, display_name, email, password, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, username, display_name AS "displayName", display_name AS "fullName", email, role, created_at
      `;
      console.log(`[AUTH-REGISTER] Đang lưu Reader mới vào Database (ID: ${userId})`);
      result = await db.query(insertQuery, [
        userId,
        username.trim().toLowerCase(),
        fullName.trim(),
        normalizedEmail,
        password,
        role
      ]);
    }

    console.log("[AUTH-REGISTER] ✓ Lưu User/Author thành công:", result.rows[0]);

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công!",
      data: { user: result.rows[0] },
    });
  } catch (err) {
    console.error("[AUTH-REGISTER] ❌ Lỗi nghiêm trọng:", err);
    if (err.code === "23505") {
      return res.status(409).json({ success: false, error: "Email này đã được sử dụng." });
    }
    next(err);
  }
}

// ── ĐĂNG NHẬP ──
async function login(req, res, next) {
  console.log("\n[AUTH-LOGIN] >>> Nhận yêu cầu đăng nhập mới");
  console.log("[AUTH-LOGIN] Body nhận được:", {
    email: req.body.email,
    role: req.body.role,
    passwordLength: req.body.password ? req.body.password.length : 0
  });

  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      console.warn("[AUTH-LOGIN] Thiếu Email hoặc Mật khẩu");
      return res.status(400).json({ success: false, error: "Email và mật khẩu là bắt buộc." });
    }

    if (!role || !["reader", "author", "admin"].includes(role)) {
      console.warn(`[AUTH-LOGIN] Role không hợp lệ (${role})`);
      return res.status(400).json({ success: false, error: "Role không hợp lệ." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[AUTH-LOGIN] Đang tìm kiếm User (email hoặc username): ${normalizedEmail}`);

    let user = null;

    // Search in both tables to find the correct user first
    const userRes = await db.query(
      `SELECT id, username, display_name, email, password, role, avatar_url, created_at, is_banned
       FROM users WHERE email = $1 OR LOWER(username) = $1`,
      [normalizedEmail]
    );
    if (userRes.rows.length > 0) {
      user = userRes.rows[0];
    } else {
      const authorRes = await db.query(
        `SELECT id, pen_name as username, email, password, 'author'::text as role, avatar_url, created_at, is_banned
         FROM authors WHERE email = $1 OR LOWER(pen_name) = $1`,
        [normalizedEmail]
      );
      if (authorRes.rows.length > 0) {
        user = authorRes.rows[0];
      }
    }

    if (!user) {
      console.warn(`[AUTH-LOGIN] Không tìm thấy user: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        error: "Email/Username hoặc mật khẩu không chính xác.",
      });
    }

    console.log("[AUTH-LOGIN] Tìm thấy user trong DB:", {
      id: user.id,
      username: user.username,
      role: user.role,
      hasPassword: !!user.password
    });

    if (!user.password) {
      console.error("[AUTH-LOGIN] ❌ Lỗi DB: User không có mật khẩu!");
      return res.status(500).json({ success: false, error: "Lỗi hệ thống: Mật khẩu chưa thiết lập." });
    }

    // 3. So sánh mật khẩu dạng plain text
    console.log("[AUTH-LOGIN] Đang so sánh password...");
    const isPasswordValid = password === user.password;
    console.log(`[AUTH-LOGIN] Kết quả so sánh mật khẩu: ${isPasswordValid ? "ĐÚNG" : "SAI"}`);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Email hoặc mật khẩu không chính xác.",
      });
    }

    // Check if banned
    if (user.is_banned) {
      return res.status(403).json({
        success: false,
        error: "Tài khoản của bạn đã bị khóa."
      });
    }    // 4. Kiểm tra phân quyền (Role Validation)
    if (role === 'author' && user.role !== 'author') {
      console.warn(`[AUTH-LOGIN] Role mismatch: User has role '${user.role}' but requested '${role}'`);
      return res.status(400).json({
        success: false,
        error: "Tài khoản của bạn không có vai trò Tác giả. Vui lòng đăng nhập đúng cổng.",
        roleMismatch: true,
        correctRole: user.role
      });
    }
    // Cập nhật last_login_at
    if (user.role === 'author') {
      await db.query("UPDATE authors SET last_login_at = NOW() WHERE id = $1", [user.id]);
    } else {
      await db.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);
    }

    // 5. Tạo JWT Token
    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    console.log("[AUTH-LOGIN] Đang tạo JWT token...");
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "novel-violet",
      subject: user.id,
    });
    console.log("[AUTH-LOGIN] ✓ Tạo JWT token thành công");

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công!",
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.role === 'author' ? user.username : (user.display_name || user.username),
          displayName: user.role === 'author' ? user.username : (user.display_name || user.username),
          username: user.role === 'author' ? user.username : user.username,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at,
        },
      },
    });
  } catch (err) {
    console.error("[AUTH-LOGIN] ❌ Lỗi nghiêm trọng:", err);
    next(err);
  }
}

// ── CẬP NHẬT THÔNG TIN CÁ NHÂN ──
async function updateProfile(req, res, next) {
  console.log("\n[AUTH-UPDATE-PROFILE] >>> Nhận yêu cầu cập nhật thông tin cá nhân");
  try {
    const { userId, displayName, username, email, password, avatarUrl } = req.body;
    if (!userId) {
      console.warn("[AUTH-UPDATE-PROFILE] Thiếu userId");
      return res.status(400).json({ success: false, error: "UserId là bắt buộc." });
    }

    let result;
    const isAuthor = userId.startsWith('AU');

    if (isAuthor) {
      if (password) {
        result = await db.query(
          `UPDATE authors
           SET pen_name = $2, email = $3, avatar_url = $4, password = $5
           WHERE id = $1
           RETURNING id, pen_name AS "fullName", pen_name AS "displayName", 'author'::text as role, email, avatar_url AS "avatarUrl", created_at`,
          [userId, displayName || username, email, avatarUrl, password]
        );
      } else {
        result = await db.query(
          `UPDATE authors
           SET pen_name = $2, email = $3, avatar_url = $4
           WHERE id = $1
           RETURNING id, pen_name AS "fullName", pen_name AS "displayName", 'author'::text as role, email, avatar_url AS "avatarUrl", created_at`,
          [userId, displayName || username, email, avatarUrl]
        );
      }
    } else {
      if (password) {
        result = await db.query(
          `UPDATE users
           SET username = $2, display_name = $3, email = $4, avatar_url = $5, password = $6
           WHERE id = $1
           RETURNING id, username, display_name AS "displayName", display_name AS "fullName", email, role, avatar_url AS "avatarUrl", created_at`,
          [userId, username, displayName, email, avatarUrl, password]
        );
      } else {
        result = await db.query(
          `UPDATE users
           SET username = $2, display_name = $3, email = $4, avatar_url = $5
           WHERE id = $1
           RETURNING id, username, display_name AS "displayName", display_name AS "fullName", email, role, avatar_url AS "avatarUrl", created_at`,
          [userId, username, displayName, email, avatarUrl]
        );
      }
    }

    if (result.rows.length === 0) {
      console.warn(`[AUTH-UPDATE-PROFILE] Không tìm thấy user hoặc author ID: ${userId}`);
      return res.status(404).json({ success: false, error: "Người dùng không tồn tại." });
    }

    console.log("[AUTH-UPDATE-PROFILE] ✓ Cập nhật thành công:", result.rows[0]);

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công!",
      data: { user: result.rows[0] }
    });
  } catch (err) {
    console.error("[AUTH-UPDATE-PROFILE] ❌ Lỗi nghiêm trọng:", err);
    next(err);
  }
}

module.exports = { register, login, updateProfile };