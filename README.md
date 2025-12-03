# 学術論文RSS集約・AI要約システム v2.0

AIED（AI in Education），認知科学，メタ認知などの学術論文をRSSフィードから自動収集し，AI（Claude/OpenAI）で要約を生成するWebアプリケーションです．

## 🚀 主な機能

- **RSS自動収集**: 主要論文誌のRSSフィードを定期的に取得
- **AI要約生成**: Claude / OpenAI APIで論文の構造化要約を生成
- **論文誌管理**: WebUIから論文誌（RSSフィード）を追加・編集・削除
- **RSSテスト**: 追加前にRSSフィードの接続確認が可能
- **ユーザー認証**: セッションベースの認証システム
- **管理者機能**: 手動フェッチ，ログ閲覧，ユーザー管理

## 📁 ディレクトリ構成

```
academic-paper-rss-system/
├── server.js              # Express バックエンドサーバー
├── package.json           # Node.js 依存関係（バックエンド）
├── .env.example           # 環境変数テンプレート
│
├── frontend/              # Vite + React フロントエンド
│   ├── package.json       # フロントエンド依存関係
│   ├── vite.config.js     # Vite設定（APIプロキシ含む）
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx       # エントリーポイント
│       ├── App.jsx        # ルートコンポーネント
│       ├── api.js         # APIクライアント
│       ├── constants.js   # 定数定義
│       ├── index.css      # Tailwind CSS
│       └── components/
│           ├── LoginForm.jsx
│           ├── Dashboard.jsx
│           ├── JournalManagement.jsx
│           ├── JournalModal.jsx
│           └── PaperCard.jsx
│
├── database/
│   └── schema.sql         # MySQLスキーマ
│
├── lib/
│   ├── database.js        # DB接続
│   ├── auth.js            # 認証ミドルウェア
│   ├── scheduler.js       # RSS取得スケジューラ
│   ├── ai-summary.js      # AI要約生成
│   └── logger.js          # ロガー
│
├── routes/
│   ├── auth.js            # 認証API
│   ├── journals.js        # 論文誌API
│   ├── papers.js          # 論文API
│   ├── summaries.js       # 要約API
│   └── admin.js           # 管理者API
│
├── scripts/
│   ├── create-user.js     # ユーザー作成スクリプト
│   └── fetch-now.js       # 手動フェッチスクリプト
│
└── logs/                  # ログファイル出力先
```

## 🛠 セットアップ

### 1. 依存関係のインストール

```bash
# バックエンド + フロントエンド両方
npm run install:all

# または個別に
npm install
cd frontend && npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
# .env を編集
```

必須の環境変数:

```env
# サーバー
PORT=3001
BASE_PATH=/autosurvey  # サブディレクトリパス

# データベース
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=academic_papers

# セッション
SESSION_SECRET=your-secret-key-here

# AI（どちらか必須）
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
AI_PROVIDER=claude  # claude または openai
```

### 3. データベースのセットアップ

```bash
# MySQLにログインしてスキーマを実行
mysql -u root -p < database/schema.sql

# または npm スクリプト
npm run db:setup
```

### 4. 管理者ユーザーの作成

```bash
node scripts/create-user.js admin your-password --admin
```

## 🚀 起動方法

### 開発環境（推奨）

**ターミナル1: バックエンドサーバー**
```bash
npm run dev
# http://localhost:3001/autosurvey/ で起動
```

**ターミナル2: Vite開発サーバー**
```bash
npm run dev:frontend
# http://localhost:5173/autosurvey/ で起動（HMR有効）
```

**または同時起動**
```bash
npm run dev:all
```

開発時は **http://localhost:5173/autosurvey/** にアクセス（ViteがAPIをバックエンドにプロキシ）

### 本番環境

```bash
# フロントエンドをビルド
npm run build

# サーバー起動
npm start
# http://localhost:3001/autosurvey/ で起動
```

### Apache リバースプロキシ設定（本番）

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    # Node.jsサーバーへのプロキシ
    ProxyPreserveHost On
    ProxyPass /autosurvey http://localhost:3001/autosurvey
    ProxyPassReverse /autosurvey http://localhost:3001/autosurvey
</VirtualHost>
```

### Nginx リバースプロキシ設定（本番）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /autosurvey {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📡 API エンドポイント

### 認証
| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/auth/login` | ログイン |
| POST | `/api/auth/logout` | ログアウト |
| GET | `/api/auth/me` | 認証状態確認 |

### 論文誌（認証必須）
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/journals` | 論文誌一覧 |
| POST | `/api/admin/journals` | 論文誌追加 |
| PUT | `/api/admin/journals/:id` | 論文誌更新 |
| DELETE | `/api/admin/journals/:id` | 論文誌無効化 |
| POST | `/api/admin/journals/:id/activate` | 論文誌有効化 |
| POST | `/api/admin/journals/test-rss` | RSSテスト |
| GET | `/api/admin/journals/:id/fetch` | 即座取得 |

### 論文（認証必須）
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/papers` | 論文一覧（フィルタ対応） |
| GET | `/api/papers/:id` | 論文詳細 |

### AI要約（認証必須）
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/summaries/providers` | 利用可能なAI一覧 |
| POST | `/api/summaries/generate` | 要約生成 |

### 管理者（管理者権限必須）
| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/admin/scheduler/run` | 全論文誌を即座取得 |
| GET | `/api/admin/logs` | 取得ログ一覧 |

## 🎨 フロントエンド技術スタック

- **Vite** - 高速ビルドツール
- **React 18** - UIライブラリ
- **Tailwind CSS** - ユーティリティファーストCSS
- **Lucide React** - アイコン

## 📰 対応RSS形式

### Springer
```
https://link.springer.com/search.rss?facet-content-type=Article&facet-journal-id=[JOURNAL_ID]
```

### Wiley
```
https://onlinelibrary.wiley.com/action/showFeed?jc=[ISSN]&type=etoc&feed=rss
```

### Elsevier (ScienceDirect)
```
https://rss.sciencedirect.com/publication/science/[ISSN]
```

### SAGE
```
https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=[JOURNAL_CODE]&type=etoc&feed=rss
```

## 🔧 トラブルシューティング

### MySQLストアドプロシージャのエラー

phpMyAdminでインポート時に`DELIMITER`エラーが出る場合:

1. テーブル・ビューのみを先にインポート
2. ストアドプロシージャは以下のSQLで個別に実行:

```sql
DROP PROCEDURE IF EXISTS cleanup_expired_sessions;
CREATE PROCEDURE cleanup_expired_sessions()
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
```

### Viteプロキシが動作しない

`vite.config.js`のプロキシ設定を確認:
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',  // バックエンドのポート
      changeOrigin: true,
    },
  },
},
```

## 📝 ライセンス

MIT License
