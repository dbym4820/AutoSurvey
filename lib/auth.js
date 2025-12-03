/**
 * 認証モジュール
 * セッションベース認証 + bcrypt
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('./database');
const logger = require('./logger');

const SALT_ROUNDS = 10;
const SESSION_EXPIRES = parseInt(process.env.SESSION_EXPIRES) || 86400; // 24時間

/**
 * パスワードをハッシュ化
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * パスワードを検証
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * セッションIDを生成
 */
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * セッションを作成
 */
async function createSession(userId) {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRES * 1000);
  
  await db.sessions.create(sessionId, userId, expiresAt);
  
  return {
    sessionId,
    expiresAt,
  };
}

/**
 * ログイン処理
 */
async function login(username, password) {
  const user = await db.users.findByUsername(username);
  
  if (!user) {
    logger.warn('Login failed: user not found', { username });
    return null;
  }
  
  const isValid = await verifyPassword(password, user.password_hash);
  
  if (!isValid) {
    logger.warn('Login failed: invalid password', { username });
    return null;
  }
  
  // 最終ログイン日時を更新
  await db.users.updateLastLogin(user.id);
  
  // セッション作成
  const session = await createSession(user.id);
  
  logger.info('Login successful', { username, userId: user.id });
  
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
    },
    session,
  };
}

/**
 * ログアウト処理
 */
async function logout(sessionId) {
  await db.sessions.delete(sessionId);
  logger.info('Logout successful', { sessionId: sessionId.substring(0, 8) + '...' });
}

/**
 * セッション検証
 */
async function validateSession(sessionId) {
  if (!sessionId) return null;
  
  const session = await db.sessions.findById(sessionId);
  
  if (!session) {
    return null;
  }
  
  return {
    userId: session.user_id,
    username: session.username,
    isAdmin: session.is_admin,
  };
}

/**
 * 認証ミドルウェア
 */
async function authMiddleware(req, res, next) {
  // Cookieからセッション取得
  const sessionId = req.cookies?.session_id;
  
  // Authorizationヘッダーからも取得可能
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  
  const token = sessionId || bearerToken;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const session = await validateSession(token);
  
  if (!session) {
    res.clearCookie('session_id');
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  // リクエストにユーザー情報を付与
  req.user = session;
  next();
}

/**
 * オプショナル認証ミドルウェア（認証なしでもアクセス可）
 */
async function optionalAuth(req, res, next) {
  const sessionId = req.cookies?.session_id;
  
  if (sessionId) {
    const session = await validateSession(sessionId);
    if (session) {
      req.user = session;
    }
  }
  
  next();
}

/**
 * 管理者権限チェックミドルウェア
 */
function adminOnly(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * ユーザー登録（管理者のみ）
 */
async function registerUser(username, password, email, isAdmin = false) {
  const existingUser = await db.users.findByUsername(username);
  
  if (existingUser) {
    throw new Error('Username already exists');
  }
  
  const passwordHash = await hashPassword(password);
  
  const user = await db.users.create({
    username,
    password_hash: passwordHash,
    email,
    is_admin: isAdmin,
  });
  
  logger.info('User registered', { username, userId: user.id });
  
  return {
    id: user.id,
    username,
    email,
    isAdmin,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  login,
  logout,
  validateSession,
  authMiddleware,
  optionalAuth,
  adminOnly,
  registerUser,
};
