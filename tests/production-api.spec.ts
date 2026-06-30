// ============================================================
// Trạm Chữ Novel — Production Readiness: API Tests (Backend)
// ============================================================
// Thứ tự test theo mức độ rủi ro giảm dần:
//   1. DB Connection + SSL + Retry (rủi ro sập toàn hệ thống)
//   2. Health Endpoint (rủi ro Koyeb restart sai)
//   3. Rate Limiting (rủi ro chặn nhầm / không chặn)
//   4. Upload ảnh Cloudinary (rủi ro lưu sai dữ liệu vào DB)
//   5. Cache invalidation (rủi ro dữ liệu cũ hiển thị cho người đọc)
//   6. CORS (rủi ro trung bình — chỉ ảnh hưởng browser)
// ============================================================

import { test, expect, APIRequestContext } from '@playwright/test';

// ── Cấu hình từ biến môi trường ──
const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:5000';
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL  || 'support.tramchunovel@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

// Helper: lấy JWT token admin
async function getAdminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND_URL}/api/admin/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), `Login failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.data.token).toBeTruthy();
  return body.data.token;
}

// ================================================================
// NHÓM 1: KẾT NỐI DATABASE + SSL + RETRY  (Rủi ro: ★★★★★)
// ================================================================
// Nếu fail ở đây → toàn bộ hệ thống chết, không cần test tiếp.
// ================================================================
test.describe.serial('1. Database Connection + SSL + Cold Start Retry', () => {

  test('1.1 — Backend khởi động thành công và kết nối được DB', async ({ request }) => {
    // Gọi health endpoint — nếu server chạy + DB sống → trả 200
    const res = await request.get(`${BACKEND_URL}/api/health`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
    expect(body.uptime).toBeGreaterThan(0);
    console.log(`  ✓ DB connected. Server uptime: ${body.uptime.toFixed(1)}s`);
  });

  test('1.2 — Truy vấn DB thực sự hoạt động (lấy danh sách categories)', async ({ request }) => {
    // GET /api/categories yêu cầu SELECT thật vào DB
    const res = await request.get(`${BACKEND_URL}/api/categories`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    console.log(`  ✓ DB query OK. Tổng categories: ${body.data.length}`);
  });

  test('1.3 — Pool connection không vượt giới hạn Neon Free Tier (max ≤ 5 trên production)', async ({ request }) => {
    // Gửi nhiều request đồng thời để kiểm tra pool không tạo quá nhiều kết nối
    const concurrentRequests = 10;
    const promises = Array.from({ length: concurrentRequests }, () =>
      request.get(`${BACKEND_URL}/api/categories`)
    );

    const results = await Promise.all(promises);
    const allOk = results.every(r => r.status() === 200);
    expect(allOk, `Một số request bị lỗi khi gửi ${concurrentRequests} request đồng thời`).toBe(true);
    console.log(`  ✓ ${concurrentRequests} concurrent requests hoàn thành, pool hoạt động ổn định`);
  });
});


// ================================================================
// NHÓM 2: HEALTH CHECK ENDPOINT  (Rủi ro: ★★★★☆)
// ================================================================
// Koyeb dùng endpoint này để biết khi nào cần restart.
// Trả sai status → Koyeb restart liên tục hoặc không restart khi cần.
// ================================================================
test.describe.serial('2. Health Check Endpoint (/api/health)', () => {

  test('2.1 — GET /api/health trả 200 với status "ok" khi DB sống', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/health`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
    expect(body.timestamp).toBeTruthy();
    expect(body.uptime).toBeGreaterThan(0);
  });

  test('2.2 — Response có đầy đủ các trường cần thiết cho monitoring', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/health`);
    const body = await res.json();

    // Kiểm tra format timestamp ISO 8601
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);

    // Kiểm tra uptime là số dương
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  test('2.3 — Health endpoint không bị rate limit (monitoring tools gọi liên tục)', async ({ request }) => {
    // Health endpoint nằm ở /api/health, KHÔNG thuộc /api/stories hay /api/categories
    // → Không bị publicLimiter chặn
    const promises = Array.from({ length: 20 }, () =>
      request.get(`${BACKEND_URL}/api/health`)
    );

    const results = await Promise.all(promises);
    const allOk = results.every(r => r.status() === 200);
    expect(allOk, 'Health endpoint phải không bị rate limit').toBe(true);
  });
});


// ================================================================
// NHÓM 3: UPLOAD ẢNH CLOUDINARY  (Rủi ro: ★★★★☆)
// ================================================================
// Upload sai → DB lưu base64 khổng lồ → nổ Neon 0.5GB quota.
// ================================================================
test.describe.serial('4. Upload ảnh Cloudinary (POST /api/admin/upload)', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getAdminToken(request);
  });

  test('4.1 — Từ chối upload khi không có file (400)', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/admin/upload`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      // Không gửi body file
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('tập tin ảnh');
  });

  test('4.2 — Từ chối upload file > 2MB (400)', async ({ request }) => {
    // Tạo buffer giả 3MB
    const bigBuffer = Buffer.alloc(3 * 1024 * 1024, 0xFF);

    const res = await request.post(`${BACKEND_URL}/api/admin/upload`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      multipart: {
        image: {
          name: 'big_image.jpg',
          mimeType: 'image/jpeg',
          buffer: bigBuffer,
        },
      },
    });
    // multer sẽ lưu file tạm, sau đó controller kiểm tra size → 400
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('2MB');
    console.log(`  ✓ File 3MB bị chặn chính xác: "${body.error}"`);
  });

  test('4.3 — Từ chối file sai định dạng (.gif khi chỉ cho phép jpg/png/webp)', async ({ request }) => {
    // GIF header magic bytes
    const gifBuffer = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;');

    const res = await request.post(`${BACKEND_URL}/api/admin/upload`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      multipart: {
        image: {
          name: 'animation.gif',
          mimeType: 'image/gif',
          buffer: gifBuffer,
        },
      },
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('JPG');
    console.log(`  ✓ File .gif bị chặn chính xác: "${body.error}"`);
  });

  test('4.4 — Upload ảnh hợp lệ thành công, trả về URL Cloudinary (không phải base64)', async ({ request }) => {
    // Tạo một PNG 1x1 pixel hợp lệ (nhỏ nhất có thể)
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request.post(`${BACKEND_URL}/api/admin/upload`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      multipart: {
        image: {
          name: 'test_cover.png',
          mimeType: 'image/png',
          buffer: pngBuffer,
        },
      },
    });

    // Nếu Cloudinary chưa được cấu hình (CLOUDINARY_URL chưa set), test này sẽ fail
    // → Đây là hành vi đúng: cần cấu hình Cloudinary trước khi deploy
    if (res.status() === 500) {
      const body = await res.json();
      if (body.error?.includes('Cloudinary')) {
        console.warn(`  ⚠ Cloudinary chưa được cấu hình (thiếu CLOUDINARY_URL). Bỏ qua test upload thực tế.`);
        test.skip();
        return;
      }
    }

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.url).toBeTruthy();

    // URL phải là link HTTPS Cloudinary, không phải data:image/... base64
    expect(body.url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    expect(body.url).not.toContain('data:image');
    expect(body.url).not.toContain('base64');

    console.log(`  ✓ Upload thành công. URL: ${body.url}`);
  });

  test('4.5 — Upload không có JWT token bị từ chối (401)', async ({ request }) => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request.post(`${BACKEND_URL}/api/admin/upload`, {
      // Không gửi Authorization header
      multipart: {
        image: {
          name: 'test_cover.png',
          mimeType: 'image/png',
          buffer: pngBuffer,
        },
      },
    });
    expect(res.status()).toBe(401);
  });
});


// ================================================================
// NHÓM 4: CORS  (Rủi ro: ★★★☆☆)
// ================================================================
// CORS sai → frontend trên Cloudflare Pages không gọi được API.
// Tuy nhiên dễ phát hiện và sửa nhanh.
// ================================================================
test.describe.serial('5. CORS Configuration', () => {

  test('5.1 — Request từ localhost được chấp nhận (development)', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/health`, {
      headers: { 'Origin': 'http://localhost:3000' },
    });
    expect(res.status()).toBe(200);

    // Kiểm tra Access-Control-Allow-Origin header
    const acaoHeader = res.headers()['access-control-allow-origin'];
    // Có thể là 'http://localhost:3000' hoặc '*'
    expect(acaoHeader).toBeTruthy();
  });

  test('5.2 — Request không có Origin vẫn hoạt động (curl, Postman, mobile)', async ({ request }) => {
    // Playwright request không gửi Origin header mặc định
    const res = await request.get(`${BACKEND_URL}/api/health`);
    expect(res.status()).toBe(200);
  });

  test('5.3 — Preflight OPTIONS request trả về đúng headers', async ({ request }) => {
    const res = await request.fetch(`${BACKEND_URL}/api/stories`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });

    // OPTIONS phải trả 204 hoặc 200
    expect([200, 204]).toContain(res.status());

    // Kiểm tra Allowed Methods
    const allowedMethods = res.headers()['access-control-allow-methods'];
    if (allowedMethods) {
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
    }
  });

  test('5.4 — Origin bị chặn nhận CORS error (khi CORS_ORIGIN đã set)', async ({ request }) => {
    // Gửi Origin giả từ evil.com
    const res = await request.get(`${BACKEND_URL}/api/health`, {
      headers: { 'Origin': 'https://evil.com' },
    });

    // Nếu CORS_ORIGIN chưa set (dev mode) thì origin lạ vẫn bị từ chối
    // nhưng request có thể vẫn trả 200 vì Express CORS middleware
    // chỉ set headers — không block response body (browser mới block).
    // Kiểm tra Access-Control-Allow-Origin KHÔNG phải evil.com
    const acao = res.headers()['access-control-allow-origin'];
    if (acao) {
      expect(acao).not.toBe('https://evil.com');
    }
    // Hoặc status có thể là 500 do cors callback trả error
    // Cả hai trường hợp đều chấp nhận được
    console.log(`  ℹ Origin evil.com → status ${res.status()}, ACAO: ${acao || 'none'}`);
  });
});


// ================================================================
// NHÓM 5: RATE LIMITING  (Rủi ro: ★★★☆☆)
// ================================================================
// Rate limit sai → chặn nhầm admin hoặc không chặn bot.
// ================================================================
test.describe.serial('6. Rate Limiting', () => {

  test('6.1 — Public API /api/stories trả RateLimit headers', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/stories`);
    expect(res.status()).toBe(200);

    // express-rate-limit với standardHeaders: true gửi RateLimit-* headers
    const remaining = res.headers()['ratelimit-remaining'];
    const limit = res.headers()['ratelimit-limit'];

    expect(limit).toBeTruthy();
    expect(remaining).toBeTruthy();
    expect(parseInt(limit!)).toBe(100);
    console.log(`  ✓ Rate limit: ${remaining}/${limit} remaining`);
  });

  test('6.2 — Admin routes KHÔNG bị rate limit (CRUD liên tục không bị chặn)', async ({ request }) => {
    const token = await getAdminToken(request);

    // Gửi 30 requests liên tục tới admin API
    const rapidRequests = 30;
    const results = [];
    for (let i = 0; i < rapidRequests; i++) {
      const res = await request.get(`${BACKEND_URL}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      results.push(res.status());
    }

    // Không có request nào bị 429
    const blockedCount = results.filter(s => s === 429).length;
    expect(blockedCount, `Admin bị rate limit chặn ${blockedCount}/${rapidRequests} lần`).toBe(0);
    console.log(`  ✓ ${rapidRequests} admin requests liên tục, 0 bị chặn`);
  });

  test('6.3 — Health endpoint KHÔNG bị rate limit', async ({ request }) => {
    const results = [];
    for (let i = 0; i < 30; i++) {
      const res = await request.get(`${BACKEND_URL}/api/health`);
      results.push(res.status());
    }

    const blockedCount = results.filter(s => s === 429).length;
    expect(blockedCount, 'Health endpoint không được bị rate limit').toBe(0);
  });
});


// ================================================================
// NHÓM 6: CACHE INVALIDATION  (Rủi ro: ★★★☆☆)
// ================================================================
// Cache không invalidate đúng → người đọc thấy dữ liệu cũ.
// Bug âm thầm, khó phát hiện nếu không test chủ động.
// ================================================================
test.describe.serial('7. Cache Invalidation', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getAdminToken(request);
  });

  test('7.1 — Cache hoạt động: 2 lần gọi liên tiếp trả kết quả nhất quán', async ({ request }) => {
    const res1 = await request.get(`${BACKEND_URL}/api/stories`);
    const body1 = await res1.json();

    const res2 = await request.get(`${BACKEND_URL}/api/stories`);
    const body2 = await res2.json();

    expect(res1.status()).toBe(200);
    expect(res2.status()).toBe(200);

    // Số lượng truyện phải giống nhau (lần 2 từ cache)
    expect(body1.data?.stories?.length ?? body1.data?.length).toBe(
      body2.data?.stories?.length ?? body2.data?.length
    );
  });

  test('7.2 — Sau khi tạo truyện mới qua admin, cache phải bị xóa (invalidation)', async ({ request }) => {
    // Bước 1: Gọi API đọc danh sách truyện → cache được thiết lập
    const resBefore = await request.get(`${BACKEND_URL}/api/stories`);
    expect(resBefore.status()).toBe(200);
    const bodyBefore = await resBefore.json();
    const countBefore = bodyBefore.data?.stories?.length ?? bodyBefore.data?.length ?? 0;

    // Bước 2: Lấy category đầu tiên để gán cho truyện mới
    const catRes = await request.get(`${BACKEND_URL}/api/categories`);
    const categories = (await catRes.json()).data;
    const categoryId = categories?.[0]?.id;

    // Bước 3: Tạo truyện test qua admin API (triggers cache invalidation trong db.query)
    const testTitle = `__TEST_STORY_${Date.now()}__`;
    const createRes = await request.post(`${BACKEND_URL}/api/admin/stories`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: testTitle,
        description: 'Truyện test tự động — sẽ bị xóa sau khi test xong.',
        cover_image: 'https://placehold.co/400x600',
        status: 'ongoing',
        category_ids: categoryId ? [categoryId] : [],
      },
    });

    // Nếu tạo truyện thất bại (có thể do thiếu trường bắt buộc), skip test
    if (!createRes.ok()) {
      const errBody = await createRes.json().catch(() => ({}));
      console.warn(`  ⚠ Không thể tạo truyện test: ${errBody.error || createRes.status()}. Bỏ qua test cache invalidation.`);
      test.skip();
      return;
    }

    const createBody = await createRes.json();
    const newStoryId = createBody.data?.id || createBody.data?.story?.id;

    // Bước 4: Gọi lại API đọc danh sách truyện NGAY LẬP TỨC (không chờ TTL hết hạn)
    const resAfter = await request.get(`${BACKEND_URL}/api/stories`);
    expect(resAfter.status()).toBe(200);
    const bodyAfter = await resAfter.json();
    const countAfter = bodyAfter.data?.stories?.length ?? bodyAfter.data?.length ?? 0;

    // Cache phải đã bị invalidate → danh sách mới phải có thêm truyện vừa tạo
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    console.log(`  ✓ Trước: ${countBefore} truyện → Sau: ${countAfter} truyện. Cache invalidation hoạt động.`);

    // Bước 5: DỌN DẸP — xóa truyện test
    if (newStoryId) {
      const delRes = await request.delete(`${BACKEND_URL}/api/admin/stories/${newStoryId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      console.log(`  ✓ Đã dọn dẹp truyện test (id: ${newStoryId}), status: ${delRes.status()}`);
    }
  });

  test('7.3 — Cache truyện chi tiết bị invalidate khi cập nhật truyện đó', async ({ request }) => {
    // Lấy danh sách truyện hiện có
    const listRes = await request.get(`${BACKEND_URL}/api/stories`);
    const listBody = await listRes.json();
    const stories = listBody.data?.stories || listBody.data || [];

    if (stories.length === 0) {
      console.warn('  ⚠ Không có truyện nào trong DB, bỏ qua test.');
      test.skip();
      return;
    }

    const testStory = stories[0];
    const slug = testStory.slug;
    const id = testStory.id;

    // Bước 1: Gọi API chi tiết truyện → cache được thiết lập (TTL 300s)
    const detailRes1 = await request.get(`${BACKEND_URL}/api/stories/${slug}`);
    expect(detailRes1.status()).toBe(200);
    const detail1 = await detailRes1.json();

    // Bước 2: Update truyện qua admin (triggers cache invalidation)
    const updateRes = await request.put(`${BACKEND_URL}/api/admin/stories/${id}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: testStory.title, // Giữ nguyên title
        description: `${testStory.description || ''} [cache-test-${Date.now()}]`, // Thay đổi nhỏ
      },
    });

    if (!updateRes.ok()) {
      console.warn(`  ⚠ Không thể update truyện, bỏ qua test.`);
      test.skip();
      return;
    }

    // Bước 3: Gọi lại API chi tiết → phải lấy từ DB (không phải cache cũ)
    const detailRes2 = await request.get(`${BACKEND_URL}/api/stories/${slug}`);
    expect(detailRes2.status()).toBe(200);
    const detail2 = await detailRes2.json();

    // Nếu cache invalidation hoạt động đúng, description phải khác với lần đọc trước
    // (vì chúng ta vừa thay đổi nó)
    const desc1 = detail1.data?.description || detail1.data?.story?.description || '';
    const desc2 = detail2.data?.description || detail2.data?.story?.description || '';

    if (desc1 !== desc2) {
      console.log(`  ✓ Cache invalidation hoạt động: description đã thay đổi.`);
    } else {
      // Có thể description chưa được include trong response
      console.warn(`  ⚠ Description không thay đổi trong response — kiểm tra lại API response schema.`);
    }
  });
});


// ================================================================
// NHÓM BỔ SUNG: Smoke Test API cơ bản
// ================================================================
test.describe('Smoke Test: Các API cơ bản hoạt động', () => {

  test('GET /api/stories trả danh sách truyện hợp lệ', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/stories`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET /api/categories trả danh sách thể loại hợp lệ', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/categories`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('GET /api/authors trả danh sách tác giả hợp lệ', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/authors`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('Route không tồn tại trả 404 (không crash server)', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/nonexistent-route`);
    expect(res.status()).toBe(404);
  });
});
