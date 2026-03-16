const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to SQLite database
const dbPath = path.join(__dirname, '..', 'model_portfolio.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Routes

// Get client holdings for Amit Sharma
app.get('/api/holdings', (req, res) => {
  const query = `
    SELECT ch.fund_id, ch.fund_name, ch.current_value, mf.allocation_pct as target_pct
    FROM client_holdings ch
    LEFT JOIN model_funds mf ON ch.fund_id = mf.fund_id
    WHERE ch.client_id = 'C001'
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get model funds
app.get('/api/model-funds', (req, res) => {
  const query = 'SELECT * FROM model_funds';
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get rebalance history
app.get('/api/history', (req, res) => {
  const query = `
    SELECT rs.session_id, rs.created_at, rs.portfolio_value, rs.total_to_buy, rs.total_to_sell, rs.net_cash_needed, rs.status,
           ri.fund_id, ri.fund_name, ri.action, ri.amount, ri.current_pct, ri.target_pct, ri.post_rebalance_pct
    FROM rebalance_sessions rs
    LEFT JOIN rebalance_items ri ON rs.session_id = ri.session_id
    WHERE rs.client_id = 'C001'
    ORDER BY rs.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Group by session
    const sessions = {};
    rows.forEach(row => {
      if (!sessions[row.session_id]) {
        sessions[row.session_id] = {
          session_id: row.session_id,
          created_at: row.created_at,
          portfolio_value: row.portfolio_value,
          total_to_buy: row.total_to_buy,
          total_to_sell: row.total_to_sell,
          net_cash_needed: row.net_cash_needed,
          status: row.status,
          items: []
        };
      }
      if (row.fund_id) {
        sessions[row.session_id].items.push({
          fund_id: row.fund_id,
          fund_name: row.fund_name,
          action: row.action,
          amount: row.amount,
          current_pct: row.current_pct,
          target_pct: row.target_pct,
          post_rebalance_pct: row.post_rebalance_pct
        });
      }
    });
    res.json(Object.values(sessions));
  });
});

// Update model funds
app.put('/api/model-funds', (req, res) => {
  const funds = req.body;
  // Validate sum to 100
  const total = funds.reduce((sum, f) => sum + parseFloat(f.allocation_pct), 0);
  if (total !== 100) {
    return res.status(400).json({ error: 'Percentages must add up to 100%' });
  }
  // Update each
  const promises = funds.map(fund => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE model_funds SET allocation_pct = ? WHERE fund_id = ?', [fund.allocation_pct, fund.fund_id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  });
  Promise.all(promises).then(() => res.json({ message: 'Updated' })).catch(err => res.status(500).json({ error: err.message }));
});

// Save rebalance session
app.post('/api/save-rebalance', (req, res) => {
  const { portfolio_value, total_to_buy, total_to_sell, net_cash_needed, items } = req.body;
  db.run('INSERT INTO rebalance_sessions (client_id, created_at, portfolio_value, total_to_buy, total_to_sell, net_cash_needed, status) VALUES (?, datetime("now"), ?, ?, ?, ?, "PENDING")',
    ['C001', portfolio_value, total_to_buy, total_to_sell, net_cash_needed], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const sessionId = this.lastID;
      const itemPromises = items.map(item => {
        return new Promise((resolve, reject) => {
          db.run('INSERT INTO rebalance_items (session_id, fund_id, fund_name, action, amount, current_pct, target_pct, post_rebalance_pct, is_model_fund) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [sessionId, item.fund_id, item.fund_name, item.action, item.amount, item.current_pct, item.target_pct, item.post_rebalance_pct, item.is_model_fund], function(err) {
              if (err) reject(err);
              else resolve();
            });
        });
      });
      Promise.all(itemPromises).then(() => res.json({ message: 'Saved', sessionId })).catch(err => res.status(500).json({ error: err.message }));
    });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});