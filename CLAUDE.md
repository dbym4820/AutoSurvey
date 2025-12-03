# CLAUDE.md - 学術論文RSS集約・AI要約システム

このファイルはClaude Codeがプロジェクトを理解するためのガイドです．

## プロジェクト概要

AIED（AI in Education），認知科学，メタ認知などの学術論文をRSSフィードから自動収集し，AI（Claude/OpenAI）で構造化要約を生成するWebアプリケーション．

## 技術スタック

### バックエンド
- **Node.js** + **Express** - APIサーバー
- **MySQL 8.0+** - データベース
- **node-cron** - スケジューラー
- **rss-parser** - RSS取得
- **bcrypt** - パスワードハッシュ
- **winston** - ロギング

### フロントエンド
- **Vite 5** - ビルドツール
- **React 18** - UIライブラリ
- **Tailwind CSS 3** - スタイリング
- **Lucide React** - アイコン

### AI連携
- **Anthropic Claude API** - 論文要約生成
- **OpenAI API** - 代替プロバイダ

## ディレクトリ構造

```
/
├── server.js              # Expressメインサーバー（サブディレクトリ対応）
├── package.json           # バックエンド依存関係
├── .env                   # 環境変数（gitignore）
├── .env.example           # 環境変数テンプレート
│
├── frontend/              # Vite + React フロントエンド
│   ├── package.json
│   ├── vite.config.js     # base: '/autosurvey/' 設定
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx        # ルートコンポーネント
│       ├── api.js         # APIクライアント（BASE_PATH対応）
│       ├── constants.js   # 定数定義
│       └── components/
│           ├── LoginForm.jsx
│           ├── Dashboard.jsx
│           ├── JournalManagement.jsx
│           ├── JournalModal.jsx
│           └── PaperCard.jsx
│
├── database/
│   └── schema.sql         # MySQLスキーマ（テーブル，ビュー，プロシージャ）
│
├── lib/
│   ├── database.js        # MySQL接続プール
│   ├── auth.js            # 認証ミドルウェア
│   ├── scheduler.js       # RSS取得スケジューラー
│   ├── ai-summary.js      # AI要約生成（Claude/OpenAI）
│   └── logger.js          # Winstonロガー
│
├── routes/
│   ├── auth.js            # POST /api/auth/login, logout, GET /me
│   ├── journals.js        # GET /api/journals
│   ├── papers.js          # GET /api/papers, /api/papers/:id
│   ├── summaries.js       # GET /api/summaries/providers, POST /generate
│   └── admin.js           # 管理者API（論文誌CRUD，スケジューラー）
│
├── scripts/
│   ├── create-user.js     # ユーザー作成CLI
│   └── fetch-now.js       # 手動RSS取得CLI
│
└── logs/                  # ログ出力先
```

## 重要な設定

### サブディレクトリパス
このシステムは `/autosurvey/` サブディレクトリで動作する設計:

- **バックエンド**: `BASE_PATH` 環境変数（デフォルト: `/autosurvey`）
- **フロントエンド**: `vite.config.js` の `base: '/autosurvey/'`
- **APIクライアント**: `api.js` で `import.meta.env.BASE_URL` を使用

### 環境変数（.env）
```env
# 必須
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
SESSION_SECRET
BASE_PATH=/autosurvey

# AI（どちらか必須）
CLAUDE_API_KEY または OPENAI_API_KEY
AI_PROVIDER=claude  # または openai
```

## よく使うコマンド

### 開発
```bash
# 依存関係インストール
npm run install:all

# 開発サーバー起動（両方同時）
npm run dev:all

# バックエンドのみ
npm run dev

# フロントエンドのみ
npm run dev:frontend
```

### 本番
```bash
# ビルド
npm run build

# 起動
npm start
```

### データベース
```bash
# スキーマ適用
npm run db:setup

# ユーザー作成
node scripts/create-user.js <username> <password> [--admin]

# 手動RSS取得
node scripts/fetch-now.js [journal-id]
```

## API構造

### 認証
- `POST /autosurvey/api/auth/login` - ログイン
- `POST /autosurvey/api/auth/logout` - ログアウト
- `GET /autosurvey/api/auth/me` - 認証状態確認

### 論文誌（要認証）
- `GET /autosurvey/api/journals` - 一覧取得
- `POST /autosurvey/api/admin/journals` - 追加（管理者）
- `PUT /autosurvey/api/admin/journals/:id` - 更新（管理者）
- `DELETE /autosurvey/api/admin/journals/:id` - 無効化（管理者）
- `POST /autosurvey/api/admin/journals/test-rss` - RSSテスト（管理者）

### 論文（要認証）
- `GET /autosurvey/api/papers` - 一覧（フィルタ対応）
- `GET /autosurvey/api/papers/:id` - 詳細

### AI要約（要認証）
- `GET /autosurvey/api/summaries/providers` - 利用可能AI一覧
- `POST /autosurvey/api/summaries/generate` - 要約生成

## データベーススキーマ

### 主要テーブル
- `users` - ユーザー
- `sessions` - セッション
- `journals` - 論文誌（RSSフィード源）
- `papers` - 論文
- `summaries` - AI要約
- `fetch_logs` - 取得ログ

### 主要ビュー
- `papers_with_journals` - 論文+論文誌情報
- `papers_with_summaries` - 論文+要約情報
- `journal_stats` - 論文誌統計

## コーディング規約

### JavaScript
- ES6+構文使用
- async/await優先
- エラーは適切にtry-catchで捕捉
- ログはwinstonロガーを使用

### React
- 関数コンポーネント + Hooks
- Tailwind CSSでスタイリング
- Lucide Reactでアイコン

### SQL
- プリペアドステートメント必須（SQLインジェクション防止）
- トランザクションは必要に応じて使用

## トラブルシューティング

### MySQLプロシージャエラー
phpMyAdminでは`DELIMITER`構文がエラーになる場合あり．
テーブル定義とプロシージャを分割してインポート．

### CORS エラー
開発時は `ALLOWED_ORIGINS` に `http://localhost:5173` を含める．

### セッションが切れる
`SESSION_EXPIRES` を確認（デフォルト: 86400秒 = 24時間）

## 注意事項

- 本番環境では必ず `NODE_ENV=production` を設定
- `SESSION_SECRET` は強力なランダム文字列を使用
- AIのAPIキーは絶対にコミットしない
- ログファイルは定期的にローテーション推奨
