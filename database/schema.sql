-- =====================================================
-- 学術論文RSS集約システム データベーススキーマ
-- MySQL 8.0+
-- =====================================================

-- データベース作成
CREATE DATABASE IF NOT EXISTS academic_papers
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE academic_papers;

-- =====================================================
-- テーブル: journals（論文誌マスタ）
-- =====================================================
CREATE TABLE IF NOT EXISTS journals (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '略称',
  full_name VARCHAR(255) NOT NULL COMMENT '正式名称',
  publisher VARCHAR(100) NOT NULL COMMENT '出版社',
  rss_url VARCHAR(500) NOT NULL COMMENT 'RSSフィードURL',
  category VARCHAR(100) COMMENT 'カテゴリ',
  color VARCHAR(50) DEFAULT 'bg-gray-500' COMMENT '表示色（Tailwind）',
  is_active BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
  last_fetched_at DATETIME COMMENT '最終取得日時',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active),
  INDEX idx_category (category)
) ENGINE=InnoDB COMMENT='論文誌マスタ';

-- =====================================================
-- テーブル: papers（論文）
-- =====================================================
CREATE TABLE IF NOT EXISTS papers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(255) COMMENT '外部ID（DOIなど）',
  journal_id VARCHAR(50) NOT NULL COMMENT '論文誌ID',
  title TEXT NOT NULL COMMENT 'タイトル',
  authors JSON COMMENT '著者リスト',
  abstract TEXT COMMENT 'アブストラクト',
  url VARCHAR(1000) COMMENT '論文URL',
  doi VARCHAR(255) COMMENT 'DOI',
  published_date DATE COMMENT '公開日',
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '取得日時',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_journal_title (journal_id, title(255)),
  INDEX idx_journal_id (journal_id),
  INDEX idx_published_date (published_date),
  INDEX idx_fetched_at (fetched_at),
  FULLTEXT INDEX ft_title_abstract (title, abstract),
  FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='論文データ';

-- =====================================================
-- テーブル: summaries（AI要約）
-- =====================================================
CREATE TABLE IF NOT EXISTS summaries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  paper_id BIGINT NOT NULL COMMENT '論文ID',
  ai_provider VARCHAR(50) NOT NULL COMMENT 'AIプロバイダ（openai/claude）',
  ai_model VARCHAR(100) NOT NULL COMMENT 'AIモデル名',
  summary_text TEXT NOT NULL COMMENT '要約テキスト',
  purpose TEXT COMMENT '研究目的',
  methodology TEXT COMMENT '手法',
  findings TEXT COMMENT '主な発見',
  implications TEXT COMMENT '教育への示唆',
  tokens_used INT COMMENT '使用トークン数',
  generation_time_ms INT COMMENT '生成時間（ミリ秒）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_paper_id (paper_id),
  INDEX idx_ai_provider (ai_provider),
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='AI要約';

-- =====================================================
-- テーブル: users（ユーザー）
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE COMMENT 'ユーザー名',
  password_hash VARCHAR(255) NOT NULL COMMENT 'パスワードハッシュ',
  email VARCHAR(255) COMMENT 'メールアドレス',
  is_admin BOOLEAN DEFAULT FALSE COMMENT '管理者フラグ',
  is_active BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
  last_login_at DATETIME COMMENT '最終ログイン日時',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB COMMENT='ユーザー';

-- =====================================================
-- テーブル: sessions（セッション）
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY COMMENT 'セッションID',
  user_id BIGINT NOT NULL COMMENT 'ユーザーID',
  expires_at DATETIME NOT NULL COMMENT '有効期限',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='セッション';

-- =====================================================
-- テーブル: fetch_logs（取得ログ）
-- =====================================================
CREATE TABLE IF NOT EXISTS fetch_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  journal_id VARCHAR(50) COMMENT '論文誌ID',
  status ENUM('success', 'error', 'partial') NOT NULL COMMENT 'ステータス',
  papers_fetched INT DEFAULT 0 COMMENT '取得論文数',
  new_papers INT DEFAULT 0 COMMENT '新規論文数',
  error_message TEXT COMMENT 'エラーメッセージ',
  execution_time_ms INT COMMENT '実行時間（ミリ秒）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_journal_id (journal_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='取得ログ';

-- =====================================================
-- テーブル: user_preferences（ユーザー設定）
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE COMMENT 'ユーザーID',
  preferred_ai_provider VARCHAR(50) DEFAULT 'claude' COMMENT '優先AIプロバイダ',
  preferred_ai_model VARCHAR(100) COMMENT '優先AIモデル',
  email_notifications BOOLEAN DEFAULT FALSE COMMENT 'メール通知',
  daily_digest BOOLEAN DEFAULT FALSE COMMENT '日次ダイジェスト',
  favorite_journals JSON COMMENT 'お気に入り論文誌',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='ユーザー設定';

-- =====================================================
-- 初期データ: 論文誌マスタ
-- =====================================================
INSERT INTO journals (id, name, full_name, publisher, rss_url, category, color) VALUES
('ijaied', 'IJAIED', 'International Journal of Artificial Intelligence in Education', 'Springer', 
 'https://link.springer.com/search.rss?facet-content-type=Article&facet-journal-id=40593', 
 'AIED', 'bg-blue-500'),

('metacognition', 'Metacognition & Learning', 'Metacognition and Learning', 'Springer',
 'https://link.springer.com/search.rss?facet-content-type=Article&facet-journal-id=11409',
 'Learning Sciences', 'bg-purple-500'),

('cogsci', 'Cognitive Science', 'Cognitive Science', 'Wiley',
 'https://onlinelibrary.wiley.com/action/showFeed?jc=15516709&type=etoc&feed=rss',
 'Cognitive Science', 'bg-green-500'),

('compedu', 'Computers & Education', 'Computers and Education', 'Elsevier',
 'https://rss.sciencedirect.com/publication/science/03601315',
 'EdTech', 'bg-orange-500'),

('bjet', 'BJET', 'British Journal of Educational Technology', 'Wiley',
 'https://onlinelibrary.wiley.com/action/showFeed?jc=14678535&type=etoc&feed=rss',
 'EdTech', 'bg-red-500'),

('lai', 'Learning & Instruction', 'Learning and Instruction', 'Elsevier',
 'https://rss.sciencedirect.com/publication/science/09594752',
 'Learning Sciences', 'bg-teal-500'),

('jecr', 'JECR', 'Journal of Educational Computing Research', 'SAGE',
 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=jeca&type=etoc&feed=rss',
 'EdTech', 'bg-indigo-500'),

('etrd', 'ETR&D', 'Educational Technology Research and Development', 'Springer',
 'https://link.springer.com/search.rss?facet-content-type=Article&facet-journal-id=11423',
 'EdTech', 'bg-pink-500')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 初期管理者ユーザー作成
-- パスワード: admin123 (bcryptハッシュ)
-- ※ 本番環境では必ず変更してください
-- =====================================================
INSERT INTO users (username, password_hash, email, is_admin) VALUES
('admin', '$2b$10$rQZ5J8YK9X5X5X5X5X5X5uYZ5J8YK9X5X5X5X5X5X5X5X5X5X5', 'admin@example.com', TRUE)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- ビュー: 最新論文（過去30日）
-- =====================================================
CREATE OR REPLACE VIEW v_recent_papers AS
SELECT 
  p.id,
  p.title,
  p.authors,
  p.abstract,
  p.url,
  p.doi,
  p.published_date,
  p.fetched_at,
  j.id AS journal_id,
  j.name AS journal_name,
  j.full_name AS journal_full_name,
  j.color AS journal_color,
  j.category,
  (SELECT COUNT(*) FROM summaries s WHERE s.paper_id = p.id) AS summary_count
FROM papers p
JOIN journals j ON p.journal_id = j.id
WHERE p.published_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
ORDER BY p.published_date DESC, p.fetched_at DESC;

-- =====================================================
-- ビュー: 論文誌統計
-- =====================================================
CREATE OR REPLACE VIEW v_journal_stats AS
SELECT 
  j.id,
  j.name,
  j.full_name,
  j.category,
  j.last_fetched_at,
  COUNT(p.id) AS total_papers,
  COUNT(CASE WHEN p.published_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) AS papers_last_week,
  COUNT(CASE WHEN p.published_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) AS papers_last_month
FROM journals j
LEFT JOIN papers p ON j.id = p.journal_id
WHERE j.is_active = TRUE
GROUP BY j.id, j.name, j.full_name, j.category, j.last_fetched_at;

-- =====================================================
-- ストアドプロシージャ: 古いセッションのクリーンアップ
-- ※ MySQLではCREATE PROCEDURE IF NOT EXISTSが使えないため
--   DROP IF EXISTS を先に実行
-- =====================================================
DROP PROCEDURE IF EXISTS cleanup_expired_sessions;

DELIMITER //
CREATE PROCEDURE cleanup_expired_sessions()
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END //
DELIMITER ;

-- =====================================================
-- イベント: 期限切れセッションの自動削除（毎時）
-- =====================================================
DROP EVENT IF EXISTS evt_cleanup_sessions;

CREATE EVENT evt_cleanup_sessions
ON SCHEDULE EVERY 1 HOUR
DO CALL cleanup_expired_sessions();

-- イベントスケジューラを有効化（必要に応じて）
-- SET GLOBAL event_scheduler = ON;
