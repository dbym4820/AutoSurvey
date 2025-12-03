#!/usr/bin/env node
/**
 * 手動RSS取得スクリプト
 * 使用方法: node scripts/fetch-now.js [journal_id]
 */

require('dotenv').config();
const scheduler = require('../lib/scheduler');
const db = require('../lib/database');
const logger = require('../lib/logger');

async function main() {
  const journalId = process.argv[2];
  
  try {
    console.log('RSS取得を開始します...\n');
    
    let result;
    if (journalId) {
      console.log(`論文誌: ${journalId}`);
      result = await scheduler.fetchJournal(journalId);
    } else {
      console.log('全論文誌を取得します');
      result = await scheduler.runNow();
    }
    
    console.log('\n=== 結果 ===');
    if (result.skipped) {
      console.log('別の取得処理が実行中のためスキップしました');
    } else if (journalId) {
      console.log(`成功: ${result.success}`);
      console.log(`取得論文数: ${result.papersFetched || 0}`);
      console.log(`新規論文数: ${result.newPapers || 0}`);
    } else {
      console.log(`総論文誌数: ${result.total}`);
      console.log(`成功: ${result.success}`);
      console.log(`失敗: ${result.failed}`);
      console.log(`新規論文数: ${result.newPapers}`);
      
      if (result.details) {
        console.log('\n=== 詳細 ===');
        for (const detail of result.details) {
          const status = detail.success ? '✓' : '✗';
          console.log(`${status} ${detail.journalName}: ${detail.newPapers || 0}件の新規論文`);
          if (detail.error) {
            console.log(`  エラー: ${detail.error}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();
