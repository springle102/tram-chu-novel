# Hướng Dẫn Chạy Test Production Readiness

## Yêu cầu trước khi chạy

### 1. Khởi động Backend
```bash
cd backend
npm install          # Lần đầu hoặc sau khi thêm dependencies mới
node src/server.js   # Hoặc: npm start
```

### 2. Khởi động Frontend
```bash
npm run dev          # Next.js dev server tại http://localhost:3000
```

### 3. Biến môi trường (tùy chọn)
Tạo file `.env` ở thư mục root hoặc export biến trước khi chạy test:

```env
BACKEND_URL=http://localhost:5000        # URL backend (mặc định)
FRONTEND_URL=http://localhost:3000       # URL frontend (mặc định)
ADMIN_EMAIL=support.tramchunovel@gmail.com
ADMIN_PASSWORD=123456
CLOUDINARY_URL=cloudinary://...          # Cần cho test upload ảnh thực tế
DATABASE_URL=postgresql://...            # Cần cho test kết nối Neon thật
```

---

## Chạy test

### Chạy TẤT CẢ test (API + E2E)
```bash
npx playwright test
```

### Chỉ chạy API tests (không cần browser, nhanh)
```bash
npx playwright test --project=api-tests
```

### Chỉ chạy E2E browser tests
```bash
npx playwright test --project=e2e-tests
```

### Chạy 1 test cụ thể theo tên
```bash
npx playwright test -g "1.1"    # Chỉ test kết nối DB
npx playwright test -g "Health"  # Tất cả test Health Check
npx playwright test -g "Upload"  # Tất cả test Upload
```

### Xem report HTML sau khi chạy
```bash
npx playwright show-report
```

---

## Thứ tự test theo mức độ rủi ro

| # | Nhóm Test | File | Rủi ro | Nếu Fail |
|---|-----------|------|--------|----------|
| 1 | DB Connection + SSL + Retry | `production-api.spec.ts` | ★★★★★ | Toàn bộ hệ thống sập |
| 2 | Health Check `/api/health` | `production-api.spec.ts` | ★★★★☆ | Koyeb restart sai |
| 3 | Build Config (Cloudflare) | `production-e2e.spec.ts` | ★★★★☆ | Deploy thất bại |
| 4 | Upload ảnh Cloudinary | Cả 2 file | ★★★★☆ | DB nổ quota 0.5GB |
| 5 | CORS | Cả 2 file | ★★★☆☆ | Frontend không gọi được API |
| 6 | Rate Limiting | Cả 2 file | ★★★☆☆ | Chặn nhầm admin hoặc bot thoải mái |
| 7 | Cache Invalidation | Cả 2 file | ★★★☆☆ | Người đọc thấy dữ liệu cũ |

---

## Lưu ý quan trọng

1. **Test DB Connection (Nhóm 1):** Nếu muốn test với Neon DB thật (SSL), set `DATABASE_URL` trong `.env` của backend trước khi khởi động.

2. **Test Upload (Nhóm 4):** Cần set `CLOUDINARY_URL` trong `.env` backend. Nếu chưa có, test upload ảnh hợp lệ sẽ bị skip tự động (các test validation vẫn chạy bình thường).

3. **Test Build (Nhóm 3):** Để test build Cloudflare Pages thực tế (không chỉ kiểm tra config), chạy riêng:
   ```bash
   npm run pages:build
   ```
   Kiểm tra output không có lỗi edge runtime.

4. **Test CORS domain thật (Nhóm 5):** Sau khi deploy, thay `FRONTEND_URL` và `BACKEND_URL` bằng URL production thật:
   ```bash
   FRONTEND_URL=https://tram-chu.pages.dev BACKEND_URL=https://your-app.koyeb.app npx playwright test --project=e2e-tests -g "CORS"
   ```
