/**
 * 要約ルーター
 * /api/summaries
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/database');
const aiSummary = require('../lib/ai-summary');
const logger = require('../lib/logger');

/**
 * GET /api/summaries/providers
 * 利用可能なAIプロバイダを取得
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = aiSummary.getAvailableProviders();
    const current = aiSummary.getCurrentProvider();
    
    res.json({
      success: true,
      providers,
      current,
    });
  } catch (error) {
    logger.error('Get providers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/summaries/generate
 * 要約を生成
 */
router.post('/generate', async (req, res) => {
  try {
    const { paperId, provider, model } = req.body;
    
    if (!paperId) {
      return res.status(400).json({ error: 'Paper ID is required' });
    }
    
    // 論文を取得
    const paper = await db.papers.findById(paperId);
    
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }
    
    // 要約を生成
    const summaryData = await aiSummary.generateSummary(paper, {
      provider,
      model,
    });
    
    // データベースに保存
    const summary = await db.summaries.create({
      paper_id: paperId,
      ...summaryData,
    });
    
    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    logger.error('Generate summary error:', error);
    
    if (error.message.includes('API key')) {
      return res.status(503).json({ error: 'AI service not configured' });
    }
    
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
});

/**
 * GET /api/summaries/:paperId
 * 論文の要約を取得
 */
router.get('/:paperId', async (req, res) => {
  try {
    const { paperId } = req.params;
    
    const summaries = await db.summaries.findByPaperId(paperId);
    
    res.json({
      success: true,
      summaries,
    });
  } catch (error) {
    logger.error('Get summaries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
