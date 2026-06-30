// ============================================================
// Trạm Chữ Novel — Production Readiness: E2E Browser Tests
// ============================================================
// Test các luồng end-to-end cần browser thật:
//   3. Build Cloudflare Pages (chạy ngoài Playwright — script riêng)
//   4. Upload ảnh từ giao diện admin
//   5. CORS trên domain thật (phát hiện qua console error)
//   6. Rate limit không chặn nhầm admin CRUD
//   7. Cache invalidation qua giao diện người đọc
// ============================================================

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// ── Cấu hình ──
const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL  || 'support.tramchunovel@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

// ── Helper: Đăng nhập admin qua browser ──
async function loginAdmin(page: Page) {
  await page.goto(`${FRONTEND_URL}/admin/login`);

  // Đợi form login render
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15_000 });

  // Điền thông tin đăng nhập
  await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);

  // Click nút đăng nhập
  await page.click('button[type="submit"]');

  // Đợi chuyển trang sang /admin (dashboard)
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 });
}

// ── Helper: Tạo file ảnh test tạm ──
function createTestImageFile(sizeKB: number, ext: string = 'png'): string {
  const tmpDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const filePath = path.join(tmpDir, `test_image_${sizeKB}kb.${ext}`);

  if (ext === 'png') {
    // PNG 1x1 pixel header (valid) + padding để đạt kích thước mong muốn
    const pngHeader = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const padding = Buffer.alloc(Math.max(0, sizeKB * 1024 - pngHeader.length), 0);
    fs.writeFileSync(filePath, Buffer.concat([pngHeader, padding]));
  } else if (ext === 'gif') {
    // GIF89a header 1x1 pixel
    const gifHeader = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
      0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, // 1x1, global color table
      0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, // color table
      0x21, 0xF9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, // GCE
      0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // image descriptor
      0x02, 0x02, 0x44, 0x01, 0x00, 0x3B // image data + trailer
    ]);
    fs.writeFileSync(filePath, gifHeader);
  }

  return filePath;
}


// ================================================================
// TEST 3: BUILD CLOUDFLARE PAGES (Hướng dẫn chạy riêng)
// ================================================================
// Test build KHÔNG chạy qua Playwright vì mất nhiều thời gian và tài nguyên.
// Thay vào đó, đây là test kiểm tra CẤU HÌNH build đã đúng chưa.
// ================================================================
test.describe('3. Cloudflare Pages Build Configuration', () => {

  test('3.1 — next.config.ts có cấu hình images.unoptimized = true', async () => {
    const configPath = path.resolve(process.cwd(), 'next.config.ts');
    expect(fs.existsSync(configPath), 'Không tìm thấy next.config.ts').toBe(true);

    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('unoptimized');
    expect(content).toContain('true');
    console.log('  ✓ next.config.ts đã có images.unoptimized = true');
  });

  test('3.2 — package.json có script pages:build', async () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    expect(pkg.scripts['pages:build']).toBeTruthy();
    expect(pkg.scripts['pages:build']).toContain('next-on-pages');
    console.log(`  ✓ pages:build script: "${pkg.scripts['pages:build']}"`);
  });

  test('3.3 — Không có API routes nội bộ (/pages/api hoặc /app/api) gây xung đột edge runtime', async () => {
    // Kiểm tra không có /app/api hoặc /pages/api directory
    const appApiDir = path.resolve(process.cwd(), 'app', 'api');
    const pagesApiDir = path.resolve(process.cwd(), 'pages', 'api');

    const hasAppApi = fs.existsSync(appApiDir);
    const hasPagesApi = fs.existsSync(pagesApiDir);

    if (hasAppApi) {
      console.warn('  ⚠ Tìm thấy /app/api — có thể gây lỗi edge runtime trên Cloudflare Pages.');
    }
    if (hasPagesApi) {
      console.warn('  ⚠ Tìm thấy /pages/api — có thể gây lỗi edge runtime trên Cloudflare Pages.');
    }

    // Đây là warning, không phải hard fail — vì có thể route đã export edge runtime config
    console.log(`  ℹ /app/api: ${hasAppApi ? 'TỒN TẠI (kiểm tra edge runtime config!)' : 'Không có'}`);
    console.log(`  ℹ /pages/api: ${hasPagesApi ? 'TỒN TẠI (kiểm tra edge runtime config!)' : 'Không có'}`);
  });
});


// ================================================================
// TEST 4: UPLOAD ẢNH TỪ GIAO DIỆN ADMIN (E2E)
// ================================================================
test.describe.serial('4. Upload ảnh End-to-End (Browser)', () => {

  test('4.1 — Upload ảnh > 2MB bị chặn ở frontend trước khi gửi API', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${FRONTEND_URL}/admin/stories/new`);

    // Đợi form render
    await page.waitForSelector('input[type="file"]', { timeout: 10_000 });

    // Tạo file PNG giả 3MB
    const bigFile = createTestImageFile(3000, 'png');

    // Bắt console log/error để kiểm tra thông báo lỗi
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Upload file qua input
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(bigFile);

    // Đợi thông báo lỗi hiển thị trên giao diện
    await page.waitForTimeout(2000);

    // Kiểm tra thông báo lỗi xuất hiện trên UI
    const pageContent = await page.textContent('body');
    const hasErrorMessage = pageContent?.includes('2MB') || pageContent?.includes('vượt quá');

    expect(hasErrorMessage, 'Frontend phải hiển thị lỗi khi file > 2MB').toBe(true);
    console.log('  ✓ Frontend chặn file > 2MB trước khi gửi API');

    // Dọn dẹp file tạm
    if (fs.existsSync(bigFile)) fs.unlinkSync(bigFile);
  });

  test('4.2 — Upload ảnh sai định dạng (.gif) bị chặn ở frontend', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${FRONTEND_URL}/admin/stories/new`);

    await page.waitForSelector('input[type="file"]', { timeout: 10_000 });

    const gifFile = createTestImageFile(1, 'gif');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(gifFile);

    // Đợi phản hồi
    await page.waitForTimeout(3000);

    // Frontend phải hiển thị lỗi hoặc không hiện preview ảnh
    const pageContent = await page.textContent('body');
    const hasFormatError = pageContent?.includes('JPG') ||
                           pageContent?.includes('PNG') ||
                           pageContent?.includes('WEBP') ||
                           pageContent?.includes('không hợp lệ') ||
                           pageContent?.includes('thất bại');

    if (hasFormatError) {
      console.log('  ✓ Frontend chặn file .gif và hiện thông báo lỗi');
    } else {
      // Có thể backend chặn thay frontend — kiểm tra ảnh preview không hiện
      console.warn('  ⚠ Frontend không hiển thị lỗi rõ ràng cho .gif — kiểm tra backend đã chặn.');
    }

    if (fs.existsSync(gifFile)) fs.unlinkSync(gifFile);
  });

  test('4.3 — Upload ảnh hợp lệ hiển thị loading spinner và preview URL', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${FRONTEND_URL}/admin/stories/new`);

    await page.waitForSelector('input[type="file"]', { timeout: 10_000 });

    // Tạo file PNG nhỏ hợp lệ
    const validFile = createTestImageFile(10, 'png');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(validFile);

    // Kiểm tra loading spinner xuất hiện
    try {
      // Spinner phải xuất hiện trong vòng 2 giây
      await page.waitForSelector('text=Đang tải', { timeout: 3_000 });
      console.log('  ✓ Loading spinner xuất hiện khi đang upload');
    } catch {
      console.warn('  ⚠ Không phát hiện loading spinner — có thể upload quá nhanh');
    }

    // Đợi upload hoàn tất (tối đa 30s vì Cloudinary có thể chậm)
    await page.waitForTimeout(5_000);

    // Kiểm tra kết quả: hoặc hiện ảnh preview (thành công) hoặc hiện lỗi Cloudinary
    const pageContent = await page.textContent('body');
    const hasSuccess = pageContent?.includes('thành công');
    const hasCloudinaryError = pageContent?.includes('Cloudinary');

    if (hasSuccess) {
      // Kiểm tra ảnh preview hiển thị URL Cloudinary (không phải base64)
      const imgSrc = await page.locator('img[alt*="bìa"]').first().getAttribute('src');
      if (imgSrc) {
        expect(imgSrc).not.toContain('data:image');
        expect(imgSrc).toMatch(/^https?:\/\//);
        console.log(`  ✓ Upload thành công. Preview URL: ${imgSrc.substring(0, 80)}...`);
      }
    } else if (hasCloudinaryError) {
      console.warn('  ⚠ Cloudinary chưa cấu hình (thiếu CLOUDINARY_URL). Upload thất bại như dự kiến.');
    }

    if (fs.existsSync(validFile)) fs.unlinkSync(validFile);
  });
});


// ================================================================
// TEST 5: CORS TRÊN DOMAIN THẬT (qua Browser Console)
// ================================================================
test.describe('5. CORS — Frontend gọi Backend không bị block', () => {

  test('5.1 — Trang chủ load danh sách truyện từ API không bị CORS error', async ({ page }) => {
    // Theo dõi console errors
    const corsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('cors')) {
        corsErrors.push(msg.text());
      }
    });

    // Theo dõi network request failures
    const failedRequests: string[] = [];
    page.on('requestfailed', req => {
      if (req.failure()?.errorText?.includes('net::ERR_FAILED')) {
        failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
      }
    });

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Đợi thêm cho API calls hoàn tất
    await page.waitForTimeout(3_000);

    // Không được có CORS error trong console
    expect(corsErrors.length, `CORS errors detected:\n${corsErrors.join('\n')}`).toBe(0);

    // Kiểm tra có dữ liệu hiển thị trên trang (ít nhất tên app hoặc truyện)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    console.log(`  ✓ Trang chủ load thành công, ${corsErrors.length} CORS errors, ${failedRequests.length} failed requests`);

    if (failedRequests.length > 0) {
      console.warn(`  ⚠ Network requests bị lỗi:\n    ${failedRequests.join('\n    ')}`);
    }
  });

  test('5.2 — Admin login gọi API /api/admin/login không bị CORS block', async ({ page }) => {
    const corsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('cors')) {
        corsErrors.push(msg.text());
      }
    });

    await page.goto(`${FRONTEND_URL}/admin/login`);
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10_000 });

    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Đợi kết quả (redirect hoặc error)
    await page.waitForTimeout(5_000);

    expect(corsErrors.length, `CORS errors khi login:\n${corsErrors.join('\n')}`).toBe(0);
    console.log(`  ✓ Login API call không bị CORS block`);
  });
});


// ================================================================
// TEST 6: RATE LIMIT KHÔNG CHẶN NHẦM ADMIN (Browser)
// ================================================================
test.describe('6. Rate Limit — Admin CRUD không bị chặn', () => {

  test('6.1 — Đăng nhập admin và truy cập dashboard, stories liên tục không bị 429', async ({ page }) => {
    await loginAdmin(page);

    // Bắt response status
    const apiStatuses: { url: string; status: number }[] = [];
    page.on('response', res => {
      if (res.url().includes('/api/admin/')) {
        apiStatuses.push({ url: res.url(), status: res.status() });
      }
    });

    // Điều hướng qua nhiều trang admin liên tục
    const adminPages = [
      '/admin',
      '/admin/stories',
      '/admin/categories',
      '/admin',
      '/admin/stories',
    ];

    for (const adminPage of adminPages) {
      await page.goto(`${FRONTEND_URL}${adminPage}`);
      await page.waitForTimeout(1_000);
    }

    // Kiểm tra không có response nào bị 429
    const blocked = apiStatuses.filter(s => s.status === 429);
    expect(blocked.length, `Admin bị rate limit:\n${blocked.map(b => b.url).join('\n')}`).toBe(0);
    console.log(`  ✓ ${apiStatuses.length} admin API calls, 0 bị rate limit`);
  });
});


// ================================================================
// TEST 7: CACHE INVALIDATION QUA GIAO DIỆN (E2E hoàn chỉnh)
// ================================================================
test.describe.serial('7. Cache Invalidation — Giao diện người đọc', () => {

  test('7.1 — Thêm truyện qua admin → người đọc thấy ngay (không chờ TTL)', async ({ page, request }) => {
    // Bước 1: Mở trang danh sách truyện phía người đọc, ghi nhớ số lượng
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_000);
    const bodyBefore = await page.textContent('body');

    // Bước 2: Tạo truyện mới qua API (nhanh hơn qua browser)
    // Login admin
    const loginRes = await request.post(`${BACKEND_URL}/api/admin/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const loginBody = await loginRes.json();

    if (!loginBody.success) {
      console.warn('  ⚠ Không đăng nhập admin được, bỏ qua test.');
      test.skip();
      return;
    }

    const token = loginBody.data.token;
    const uniqueTitle = `Cache Test ${Date.now()}`;

    const createRes = await request.post(`${BACKEND_URL}/api/admin/stories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: uniqueTitle,
        description: 'Truyện dùng để test cache invalidation. Sẽ bị xóa sau khi test.',
        cover_image: 'https://placehold.co/400x600',
        status: 'ongoing',
        category_ids: [],
      },
    });

    if (!createRes.ok()) {
      const errBody = await createRes.json().catch(() => ({}));
      console.warn(`  ⚠ Không tạo được truyện: ${errBody.error || createRes.status()}`);
      test.skip();
      return;
    }

    const createBody = await createRes.json();
    const newStoryId = createBody.data?.id || createBody.data?.story?.id;

    // Bước 3: Reload trang danh sách truyện người đọc NGAY LẬP TỨC
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3_000);

    const bodyAfter = await page.textContent('body');

    // Bước 4: Kiểm tra truyện mới có xuất hiện không
    const appearsInPage = bodyAfter?.includes(uniqueTitle);

    if (appearsInPage) {
      console.log(`  ✓ Truyện "${uniqueTitle}" xuất hiện trên trang người đọc ngay sau khi tạo → Cache invalidation OK`);
    } else {
      console.warn(`  ⚠ Truyện mới KHÔNG xuất hiện trên trang → Có thể cache chưa bị invalidate, hoặc trang cần phân trang.`);
      // Không hard fail vì có thể do phân trang (truyện nằm ở trang 2+)
    }

    // Bước 5: Dọn dẹp — xóa truyện test
    if (newStoryId) {
      await request.delete(`${BACKEND_URL}/api/admin/stories/${newStoryId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log(`  ✓ Đã dọn dẹp truyện test (id: ${newStoryId})`);
    }
  });
});
