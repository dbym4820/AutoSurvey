/**
 * 認証ルーター
 * /api/auth
 */

const express = require('express');
const router = express.Router();
const auth = require('../lib/auth');
const logger = require('../lib/logger');

/**
 * POST /api/auth/login
 * ログイン
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const result = await auth.login(username, password);
    
    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // セッションCookieを設定
    res.cookie('session_id', result.session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: result.session.expiresAt,
    });
    
    res.json({
      success: true,
      user: result.user,
      expiresAt: result.session.expiresAt,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * ログアウト
 */
router.post('/logout', async (req, res) => {
  try {
    const sessionId = req.cookies?.session_id;
    
    if (sessionId) {
      await auth.logout(sessionId);
    }
    
    res.clearCookie('session_id');
    res.json({ success: true });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * 現在のユーザー情報を取得
 */
router.get('/me', async (req, res) => {
  try {
    const sessionId = req.cookies?.session_id;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const session = await auth.validateSession(sessionId);
    
    if (!session) {
      res.clearCookie('session_id');
      return res.status(401).json({ error: 'Session expired' });
    }
    
    res.json({
      authenticated: true,
      user: {
        id: session.userId,
        username: session.username,
        isAdmin: session.isAdmin,
      },
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register
 * ユーザー登録（管理者のみ）
 */
router.post('/register', auth.authMiddleware, auth.adminOnly, async (req, res) => {
  try {
    const { username, password, email, isAdmin } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const user = await auth.registerUser(username, password, email, isAdmin);
    
    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    if (error.message === 'Username already exists') {
      return res.status(409).json({ error: error.message });
    }
    logger.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
