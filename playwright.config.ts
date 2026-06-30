import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright Configuration cho dự án Trạm Chữ Novel
 * 
 * Bao gồm 2 loại test:
 * 1. API Tests (Backend): Chạy trực tiếp qua HTTP requests, không cần browser
 * 2. E2E Tests (Frontend + Backend): Cần cả 2 servers chạy đồng thời
 * 
 * Biến môi trường cần thiết:
 *   BACKEND_URL    – URL của backend API (mặc định: http://localhost:5000)
 *   FRONTEND_URL   – URL của frontend Next.js (mặc định: http://localhost:3000)
 *   DATABASE_URL   – Connection string Neon DB (cần cho test DB/SSL)
 *   ADMIN_EMAIL    – Email admin để test login (mặc định: support.tramchunovel@gmail.com)
 *   ADMIN_PASSWORD – Mật khẩu admin (mặc định: 123456)
 *   CLOUDINARY_URL – URL Cloudinary SDK (cần cho test upload)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,       // Chạy tuần tự vì test có dependency thứ tự rủi ro
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                 // Chạy 1 worker vì test có trạng thái phụ thuộc lẫn nhau
  reporter: [
    ['html', { open: 'never' }],
    ['list'],                  // In kết quả từng test ra console
  ],
  timeout: 60_000,            // 60s timeout mỗi test (Neon cold start có thể lâu)

  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true,
  },

  projects: [
    // ── Project 1: API Tests (chỉ dùng request context, không cần browser) ──
    {
      name: 'api-tests',
      testMatch: /production-api\.spec\.ts/,
      use: {
        baseURL: process.env.BACKEND_URL || 'http://localhost:5000',
      },
    },
    // ── Project 2: E2E Browser Tests ──
    {
      name: 'e2e-tests',
      testMatch: /production-e2e\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
      },
    },
  ],

  /* Tự động khởi động cả backend và frontend trước khi test */
  // Uncomment khi muốn tự động khởi server:
  // webServer: [
  //   {
  //     command: 'node src/server.js',
  //     cwd: path.resolve(__dirname, 'backend'),
  //     port: 5000,
  //     reuseExistingServer: true,
  //     timeout: 30_000,
  //   },
  //   {
  //     command: 'npm run dev',
  //     port: 3000,
  //     reuseExistingServer: true,
  //     timeout: 30_000,
  //   },
  // ],
});
