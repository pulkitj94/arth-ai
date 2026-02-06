/**
 * Attribution API Routes (ES6 Module)
 * 
 * Provides endpoints for Multi-Touch Attribution analysis:
 * - GET /api/attribution/summary - Platform-level summary
 * - GET /api/attribution/campaigns - Campaign-level details
 * - GET /api/attribution/budget-recommendations - Budget optimization
 * - POST /api/attribution/calculate - Trigger attribution calculation
 */

import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// ES6 module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const ATTRIBUTION_SCRIPT_PATH = path.join(__dirname, '..', '..', 'scripts', 'attribution', 'main.py');
const ATTRIBUTION_DATA_PATH = path.join(__dirname, '..', 'data', 'attribution');

/**
 * Helper: Read CSV and convert to JSON
 */
function csvToJson(filePath) {
  try {
    const csv = fs.readFileSync(filePath, 'utf8');
    const lines = csv.trim().split('\n');
    
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',');
      const obj = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        // Try to parse numbers
        obj[header] = isNaN(value) ? value : parseFloat(value);
      });
      
      data.push(obj);
    }
    
    return data;
  } catch (error) {
    console.error(`Error reading CSV ${filePath}:`, error.message);
    return null;
  }
}

/**
 * GET /api/attribution/summary
 * Returns platform-level attribution summary
 */
router.get('/summary', (req, res) => {
  try {
    const filePath = path.join(ATTRIBUTION_DATA_PATH, 'platform_summary.csv');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Attribution data not found. Please run calculation first.',
        hint: 'POST /api/attribution/calculate'
      });
    }
    
    const data = csvToJson(filePath);
    
    if (!data) {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse platform summary'
      });
    }
    
    res.json({
      success: true,
      data,
      timestamp: fs.statSync(filePath).mtime
    });
    
  } catch (error) {
    console.error('Error in /attribution/summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/attribution/campaigns
 * Returns campaign-level attribution details
 */
router.get('/campaigns', (req, res) => {
  try {
    const filePath = path.join(ATTRIBUTION_DATA_PATH, 'attributed_campaigns.csv');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Attribution data not found. Please run calculation first.'
      });
    }
    
    const data = csvToJson(filePath);
    
    if (!data) {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse campaign data'
      });
    }
    
    // Optional: Filter by platform
    const { platform } = req.query;
    const filteredData = platform 
      ? data.filter(d => d.platform === platform.toLowerCase())
      : data;
    
    res.json({
      success: true,
      data: filteredData,
      count: filteredData.length,
      timestamp: fs.statSync(filePath).mtime
    });
    
  } catch (error) {
    console.error('Error in /attribution/campaigns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/attribution/budget-recommendations
 * Returns budget optimization recommendations
 */
router.get('/budget-recommendations', (req, res) => {
  try {
    const filePath = path.join(ATTRIBUTION_DATA_PATH, 'budget_recommendations.json');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Budget recommendations not found. Please run calculation first.'
      });
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    res.json({
      success: true,
      data,
      timestamp: fs.statSync(filePath).mtime
    });
    
  } catch (error) {
    console.error('Error in /attribution/budget-recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/attribution/sessions
 * Returns user journey session data (for debugging)
 */
router.get('/sessions', (req, res) => {
  try {
    const filePath = path.join(ATTRIBUTION_DATA_PATH, 'ad_sessions.csv');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Session data not found.'
      });
    }
    
    const data = csvToJson(filePath);
    
    if (!data) {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse session data'
      });
    }
    
    // Optional: Limit results
    const limit = parseInt(req.query.limit) || 100;
    const limitedData = data.slice(0, limit);
    
    res.json({
      success: true,
      data: limitedData,
      total: data.length,
      showing: limitedData.length,
      timestamp: fs.statSync(filePath).mtime
    });
    
  } catch (error) {
    console.error('Error in /attribution/sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/attribution/calculate
 * Triggers attribution calculation
 * 
 * Body params:
 * - days: Number of days to look back (default: all data)
 * - startDate: Custom start date (YYYY-MM-DD)
 * - endDate: Custom end date (YYYY-MM-DD)
 * - skipBudget: Skip budget optimization (default: false)
 * - clear: Clear existing output files (default: false)
 */
router.post('/calculate', (req, res) => {
  const { days, startDate, endDate, skipBudget, clear } = req.body;
  
  // Build command arguments
  const args = [ATTRIBUTION_SCRIPT_PATH];
  
  if (startDate && endDate) {
    args.push('--start-date', startDate, '--end-date', endDate);
  } else if (days) {
    args.push('--days', days.toString());
  }
  
  if (skipBudget) {
    args.push('--skip-budget');
  }
  
  if (clear) {
    args.push('--clear');
  }
  
  console.log('🔄 Starting attribution calculation...');
  console.log('Command:', 'python3', args.join(' '));
  
  const python = spawn('python3', args);
  
  let output = '';
  let error = '';
  
  python.stdout.on('data', (data) => {
    const chunk = data.toString();
    output += chunk;
    console.log('[Attribution]', chunk.trim());
  });
  
  python.stderr.on('data', (data) => {
    const chunk = data.toString();
    error += chunk;
    console.error('[Attribution Error]', chunk.trim());
  });
  
  python.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Attribution calculation complete');
      res.json({
        success: true,
        message: 'Attribution calculated successfully',
        output: output.trim()
      });
    } else {
      console.error('❌ Attribution calculation failed with code', code);
      res.status(500).json({
        success: false,
        message: 'Attribution calculation failed',
        error: error.trim() || output.trim(),
        code
      });
    }
  });
  
  python.on('error', (err) => {
    console.error('❌ Failed to start attribution process:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to start attribution process',
      error: err.message
    });
  });
});

/**
 * GET /api/attribution/status
 * Check if attribution data exists and when it was last calculated
 */
router.get('/status', (req, res) => {
  try {
    const files = [
      'platform_summary.csv',
      'attributed_campaigns.csv',
      'budget_recommendations.json',
      'ad_sessions.csv'
    ];
    
    const status = files.map(file => {
      const filePath = path.join(ATTRIBUTION_DATA_PATH, file);
      const exists = fs.existsSync(filePath);
      
      return {
        file,
        exists,
        lastModified: exists ? fs.statSync(filePath).mtime : null
      };
    });
    
    const allExist = status.every(s => s.exists);
    const lastCalculated = allExist 
      ? Math.max(...status.filter(s => s.lastModified).map(s => new Date(s.lastModified).getTime()))
      : null;
    
    res.json({
      success: true,
      ready: allExist,
      lastCalculated: lastCalculated ? new Date(lastCalculated) : null,
      files: status
    });
    
  } catch (error) {
    console.error('Error in /attribution/status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
