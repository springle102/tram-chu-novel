CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ────────────────────────────────────────────────────────────
-- 1. DROP EXISTING TABLES FOR CLEAN INITIALIZATION
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS admin_audit_logs CASCADE;
DROP TABLE IF EXISTS site_settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS reading_history CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS story_categories CASCADE;
DROP TABLE IF EXISTS stories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS authors CASCADE; -- Đã thay thế author_profiles bằng authors
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ────────────────────────────────────────────────────────────
-- 2. ENUM TYPES
-- ────────────────────────────────────────────────────────────
-- Enum user_role giờ chỉ còn Độc giả
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('reader');

DROP TYPE IF EXISTS story_status CASCADE;
CREATE TYPE story_status AS ENUM ('ongoing', 'completed');

-- ────────────────────────────────────────────────────────────
-- 3. BẢNG USERS (ĐỘC GIẢ)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50)  NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password      VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'reader',
  avatar_url    TEXT,
  is_banned     BOOLEAN      NOT NULL DEFAULT false,
  banned_at     TIMESTAMPTZ,
  ban_reason    TEXT,
  can_comment   BOOLEAN      NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin (username gin_trgm_ops);

-- ────────────────────────────────────────────────────────────
-- 3.5. BẢNG ADMINS (QUẢN TRỊ VIÊN)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50)  NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password      VARCHAR(255) NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,

  CONSTRAINT uq_admins_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins (email);

-- ────────────────────────────────────────────────────────────
-- 4. BẢNG AUTHORS (TÁC GIẢ)
-- ────────────────────────────────────────────────────────────
-- Tác giả giờ đây là một thực thể hoàn toàn độc lập, có tài khoản login riêng
CREATE TABLE IF NOT EXISTS authors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pen_name      VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password      VARCHAR(255) NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  donation_link TEXT,
  total_views   BIGINT       NOT NULL DEFAULT 0,
  is_banned     BOOLEAN      NOT NULL DEFAULT false,
  banned_at     TIMESTAMPTZ,
  ban_reason    TEXT,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_authors_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_authors_email ON authors (email);
CREATE INDEX IF NOT EXISTS idx_authors_pen_name_trgm ON authors USING gin (pen_name gin_trgm_ops);

-- ────────────────────────────────────────────────────────────
-- 4.5. BẢNG CATEGORIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(100) NOT NULL,
  CONSTRAINT uq_categories_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);

-- ────────────────────────────────────────────────────────────
-- 5. BẢNG STORIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id     UUID         NOT NULL, -- FK giờ trỏ về bảng authors
  category_id   UUID,
  title         VARCHAR(300) NOT NULL,
  slug          VARCHAR(350) NOT NULL,
  cover_image   TEXT,
  description   TEXT,
  status        story_status NOT NULL DEFAULT 'ongoing',
  view_count    BIGINT       NOT NULL DEFAULT 0,
  rating        NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  chapter_count INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_stories_slug UNIQUE (slug),

  -- FK: Truyện thuộc về 1 tác giả (trỏ vào bảng authors)
  CONSTRAINT fk_stories_author
    FOREIGN KEY (author_id) REFERENCES authors (id)
    ON DELETE CASCADE,

  CONSTRAINT fk_stories_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 5.0. BẢNG STORY_CATEGORIES (QUAN HỆ NHIỀU - NHIỀU)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS story_categories (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_story_categories_story_id ON story_categories (story_id);
CREATE INDEX IF NOT EXISTS idx_story_categories_category_id ON story_categories (category_id);

CREATE INDEX IF NOT EXISTS idx_stories_updated_at_desc ON stories (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_slug ON stories (slug);
CREATE INDEX IF NOT EXISTS idx_stories_author_id ON stories (author_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories (status);
CREATE INDEX IF NOT EXISTS idx_stories_category_id ON stories (category_id);
CREATE INDEX IF NOT EXISTS idx_stories_title_trgm ON stories USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stories_latest_covering ON stories (updated_at DESC) INCLUDE (id, title, slug, cover_image, category_id, author_id, rating, chapter_count);

-- ────────────────────────────────────────────────────────────
-- 5.1. BẢNG CHAPTERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id      UUID         NOT NULL,
  chapter_number INTEGER     NOT NULL,
  title         VARCHAR(300) NOT NULL,
  content       TEXT         NOT NULL,
  word_count    INTEGER      NOT NULL DEFAULT 0,
  view_count    BIGINT       NOT NULL DEFAULT 0,
  is_published  BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_chapters_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
  CONSTRAINT uq_chapters_story_number UNIQUE (story_id, chapter_number)
);
CREATE INDEX IF NOT EXISTS idx_chapters_story_id ON chapters (story_id);

-- ────────────────────────────────────────────────────────────
-- 5.2. BẢNG COMMENTS
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE comment_status AS ENUM ('pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID, -- NULLABLE: Vì có thể là tác giả bình luận
  author_id     UUID, -- NULLABLE: Cho phép tác giả trả lời bình luận
  story_id      UUID         NOT NULL,
  chapter_id    UUID,
  parent_id     UUID,
  content       TEXT         NOT NULL,
  status        comment_status NOT NULL DEFAULT 'approved',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  
  -- Ràng buộc: Một comment phải thuộc về user HOẶC author (không thể cả hai bị rỗng)
  CONSTRAINT chk_comment_owner CHECK (
    (user_id IS NOT NULL AND author_id IS NULL) OR 
    (user_id IS NULL AND author_id IS NOT NULL)
  ),
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES authors (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_chapter FOREIGN KEY (chapter_id) REFERENCES chapters (id) ON DELETE SET NULL,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_story_id ON comments (story_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments (author_id);

-- ────────────────────────────────────────────────────────────
-- (CÁC BẢNG KHÁC GIỮ NGUYÊN: ratings, bookmarks, reading_history, reports, site_settings)
-- Lưu ý: Ở mức độ cơ bản, độc giả (users) là người tương tác chính. 
-- Nếu muốn tác giả cũng rate/bookmark được, bạn cần thêm cột author_id tương tự như bảng Comments.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ratings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID         NOT NULL,
  story_id      UUID         NOT NULL,
  score         SMALLINT     NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ratings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_ratings_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
  CONSTRAINT uq_ratings_user_story UNIQUE (user_id, story_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID         NOT NULL,
  story_id          UUID         NOT NULL,
  last_read_chapter INTEGER      DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmarks_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
  CONSTRAINT uq_bookmarks_user_story UNIQUE (user_id, story_id)
);

CREATE TABLE IF NOT EXISTS reading_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID,
  story_id      UUID         NOT NULL,
  chapter_id    UUID,
  read_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ip_address    INET,
  user_agent    TEXT,
  CONSTRAINT fk_rh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_rh_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
  CONSTRAINT fk_rh_chapter FOREIGN KEY (chapter_id) REFERENCES chapters (id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 5.6. BẢNG REPORTS (BÁO CÁO)
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID, -- Người báo cáo (reader)
  story_id      UUID, -- Truyện bị báo cáo (nếu có)
  comment_id    UUID, -- Bình luận bị báo cáo (nếu có)
  reason        TEXT NOT NULL,
  status        report_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_comment FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);

-- ────────────────────────────────────────────────────────────
-- 5.7. BẢNG NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('new_chapter', 'comment_reply', 'story_approved', 'story_rejected', 'system', 'report_resolved', 'new_comment', 'new_rating', 'new_bookmark'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID, -- Người nhận có thể là user...
  author_id     UUID, -- ...hoặc là tác giả
  type          notification_type NOT NULL,
  title         VARCHAR(200)      NOT NULL,
  message       TEXT              NOT NULL,
  link          TEXT,
  is_read       BOOLEAN           NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_notification_owner CHECK (
    (user_id IS NOT NULL AND author_id IS NULL) OR 
    (user_id IS NULL AND author_id IS NOT NULL)
  ),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_author FOREIGN KEY (author_id) REFERENCES authors (id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 5.8. BẢNG SITE_SETTINGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key           VARCHAR(100) PRIMARY KEY,
  value         TEXT         NOT NULL,
  description   TEXT,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by    UUID,
  CONSTRAINT fk_settings_admin FOREIGN KEY (updated_by) REFERENCES admins (id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 5.9. BẢNG ADMIN_AUDIT_LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id      UUID,
  action        VARCHAR(100) NOT NULL,
  target_type   VARCHAR(50)  NOT NULL,
  target_id     UUID         NOT NULL,
  details       JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- 6. TRIGGER: Tự động cập nhật updated_at khi UPDATE
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_stories_updated_at ON stories;
CREATE TRIGGER set_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 7. KHỞI TẠO CẤU HÌNH & TÀI KHOẢN HỆ THỐNG MẶC ĐỊNH (SYSTEM DATA)
-- ────────────────────────────────────────────────────────────

-- Chèn tài khoản Admins mặc định để quản trị viên có thể đăng nhập
INSERT INTO admins (id, username, email, password, avatar_url) VALUES
('d3b07384-d113-4cf1-a5ee-a83d1c258800', 'Admin', 'admin@novelviolet.com', '123456', 'https://placehold.co/150x150/dc2626/white?text=AD'),
('d3b07384-d113-4cf1-a5ee-a83d1c25880a', 'Admin Demo', 'demoadmin@novelviolet.com', '123456', 'https://placehold.co/150x150/3b82f6/white?text=AD')
ON CONFLICT (email) DO NOTHING;

-- Chèn cấu hình hệ thống mặc định
INSERT INTO site_settings (key, value, description) VALUES
('site_name', 'Novel Violet', 'Tên website'),
('site_description', 'Đọc truyện tiểu thuyết online', 'Mô tả website'),
('favicon_url', 'https://placehold.co/32x32/8b5cf6/white?text=NV', 'Favicon của website'),
('maintenance_mode', 'false', 'Chế độ bảo trì'),
('auto_approve_comments', 'true', 'Tự động duyệt bình luận'),
('min_chapter_length', '500', 'Độ gia tối thiểu 1 chương (ký tự)'),
('allow_guest_reading', 'true', 'Cho phép đọc không cần đăng nhập'),
('allow_comments', 'true', 'Cho phép bình luận (toàn hệ thống)'),
('max_login_attempts', '5', 'Số lần đăng nhập sai tối đa'),
('session_timeout_hours', '24', 'Thời gian hết hạn session')
ON CONFLICT (key) DO NOTHING;

-- Chèn các thể loại truyện hệ thống
INSERT INTO categories (id, name, slug) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'Tu tiên', 'tu-tien'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'Huyền huyễn', 'huyen-huyen'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'Đam mỹ', 'dam-my'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'Hiện đại', 'hien-dai'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05', 'Đô thị', 'do-thi'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c06', 'Cung đình', 'cung-dinh'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c07', 'Âm mưu', 'am-muu'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c08', 'Ma pháp', 'ma-phap')
ON CONFLICT (slug) DO NOTHING;