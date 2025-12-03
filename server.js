/**
 * 学術論文RSS集約システム - メインサーバー
 * Express + MySQL + 認証 + スケジューラー
 * サブディレクトリ対応（/autosurvey/）
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const db = require('./lib/database');
const { authMiddleware, optionalAuth } = require('./lib/auth');
const scheduler = require('./lib/scheduler');
const logger = require('./lib/logger');

// ルーター
const authRouter = require('./routes/auth');
const papersRouter = require('./routes/papers');
const journalsRouter = require('./routes/journals');
const summariesRouter = require('./routes/summaries');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ベースパス（サブディレクトリ）
const BASE_PATH = process.env.BASE_PATH || '/autosurvey';

// =====================================================
// ミドルウェア設定
// =====================================================

// セキュリティヘッダー
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS設定
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// レート制限（ベースパス対応）
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' },
});

// ボディパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// リクエストログ
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// =====================================================
// サブディレクトリ用ルーター
// =====================================================

const router = express.Router();

// 静的ファイル（本番: Viteビルド済み）
if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'frontend', 'dist');
  router.use(express.static(distPath));
}

// レート制限をAPIに適用
router.use('/api/', limiter);

// APIルート - 認証不要
router.use('/api/auth', authRouter);

// ヘルスチェック
router.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    basePath: BASE_PATH,
    scheduler: scheduler.getStatus(),
  });
});

// APIルート - 認証必須
router.use('/api/papers', authMiddleware, papersRouter);
router.use('/api/journals', authMiddleware, journalsRouter);
router.use('/api/summaries', authMiddleware, summariesRouter);
router.use('/api/admin', authMiddleware, adminRouter);

// フロントエンドルーティング（SPA対応）
router.get('*', (req, res) => {
  // APIリクエストは404を返す
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  if (NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  } else {
    // 開発環境ではVite devサーバーを使用するため、
    // ここに到達した場合はViteへリダイレクト案内
    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>開発環境</h1>
          <p>Vite開発サーバーを起動してください:</p>
          <pre style="background: #f5f5f5; padding: 20px; border-radius: 8px;">cd frontend && npm run dev</pre>
          <p>その後 <a href="http://localhost:5173/autosurvey/">http://localhost:5173/autosurvey/</a> にアクセス</p>
        </body>
      </html>
    `);
  }
});

// ベースパスにルーターをマウント
app.use(BASE_PATH, router);

// ルートへのアクセスをリダイレクト
app.get('/', (req, res) => {
  res.redirect(BASE_PATH + '/');
});

// =====================================================
// エラーハンドリング
// =====================================================

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  res.status(err.status || 500).json({
    error: NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});

// 404ハンドラ
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// =====================================================
// サーバー起動
// =====================================================

async function startServer() {
  try {
    // データベース接続テスト
    await db.testConnection();
    logger.info('Database connected successfully');
    
    // スケジューラー開始
    if (process.env.FETCH_ENABLED === 'true') {
      scheduler.start();
      logger.info('RSS fetch scheduler started');
    }
    
    // サーバー起動
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${NODE_ENV}`);
      logger.info(`Base path: ${BASE_PATH}`);
      logger.info(`AI Provider: ${process.env.AI_PROVIDER || 'claude'}`);
      logger.info(`Access URL: http://localhost:${PORT}${BASE_PATH}/`);
      if (NODE_ENV === 'development') {
        logger.info('Frontend dev server: http://localhost:5173/autosurvey/');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  scheduler.stop();
  await db.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  scheduler.stop();
  await db.end();
  process.exit(0);
});

startServer();

module.exports = app;
