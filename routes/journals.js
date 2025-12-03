/**
 * 論文誌ルーター
 * /api/journals
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/database');
const logger = require('../lib/logger');

/**
 * GET /api/journals
 * 論文誌一覧を取得
 */
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;
    const activeOnly = all !== 'true';
    
    const journals = await db.journals.findAll(activeOnly);
    
    res.json({
      success: true,
      journals,
    });
  } catch (error) {
    logger.error('Get journals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/journals/:id
 * 論文誌詳細を取得
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const journal = await db.journals.findById(id);
    
    if (!journal) {
      return res.status(404).json({ error: 'Journal not found' });
    }
    
    // 最近の論文も取得
    const recentPapers = await db.papers.findAll({
      journalIds: [id],
      limit: 10,
    });
    
    res.json({
      success: true,
      journal: {
        ...journal,
        recentPapers,
      },
    });
  } catch (error) {
    logger.error('Get journal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
