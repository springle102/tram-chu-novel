// ============================================================
// Trạm Chữ Novel — In-memory Cache Utility (Zero Dependency)
// ============================================================
// Hỗ trợ lưu trữ tạm thời các phản hồi đọc dữ liệu công khai
// để giảm tải số truy vấn tới Neon DB và Koyeb CPU.
// ============================================================

const cache = new Map();

/**
 * Đặt dữ liệu vào cache
 * @param {string} key - Mã định danh cache
 * @param {any} value - Dữ liệu cần cache
 * @param {number} ttlSeconds - Thời gian sống của cache tính bằng giây (TTL)
 */
function set(key, value, ttlSeconds = 60) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cache.set(key, { value, expiresAt });
}

/**
 * Lấy dữ liệu từ cache
 * @param {string} key - Mã định danh cache
 * @returns {any|null} Trả về dữ liệu nếu hợp lệ, ngược lại trả về null
 */
function get(key) {
  const cachedData = cache.get(key);
  if (!cachedData) return null;

  // Kiểm tra nếu cache đã hết hạn
  if (Date.now() > cachedData.expiresAt) {
    cache.delete(key);
    return null;
  }

  return cachedData.value;
}

/**
 * Xóa một phần tử trong cache theo key
 * @param {string} key
 */
function del(key) {
  cache.delete(key);
}

/**
 * Xóa toàn bộ cache
 */
function clear() {
  cache.clear();
}

/**
 * Xóa các phần tử cache có tiền tố khớp với pattern (dùng để invalidate cache)
 * Ví dụ: deletePattern("stories:")
 * @param {string} pattern - Tiền tố hoặc từ khóa khớp
 */
function deletePattern(pattern) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

module.exports = {
  set,
  get,
  del,
  clear,
  deletePattern,
};
