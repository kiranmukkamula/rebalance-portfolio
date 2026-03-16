const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'model_portfolio.db');
const db = new sqlite3.Database(dbPath);

const statements = [
  `PRAGMA foreign_keys = ON;`,
  `DROP TABLE IF EXISTS rebalance_items;`,
  `DROP TABLE IF EXISTS rebalance_sessions;`,
  `DROP TABLE IF EXISTS client_holdings;`,
  `DROP TABLE IF EXISTS model_funds;`,
  `DROP TABLE IF EXISTS clients;`,

  `CREATE TABLE clients (
    client_id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    total_invested INTEGER NOT NULL
  );`,

  `CREATE TABLE model_funds (
    fund_id TEXT PRIMARY KEY,
    fund_name TEXT NOT NULL,
    asset_class TEXT NOT NULL,
    allocation_pct REAL NOT NULL
  );`,

  `CREATE TABLE client_holdings (
    holding_id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    fund_id TEXT NOT NULL,
    fund_name TEXT NOT NULL,
    current_value INTEGER NOT NULL
  );`,

  `CREATE TABLE rebalance_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    portfolio_value INTEGER NOT NULL,
    total_to_buy INTEGER NOT NULL,
    total_to_sell INTEGER NOT NULL,
    net_cash_needed INTEGER NOT NULL,
    status TEXT NOT NULL
  );`,

  `CREATE TABLE rebalance_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    fund_id TEXT NOT NULL,
    fund_name TEXT NOT NULL,
    action TEXT NOT NULL,
    amount INTEGER NOT NULL,
    current_pct REAL,
    target_pct REAL,
    post_rebalance_pct REAL,
    is_model_fund INTEGER NOT NULL
  );`,

  `INSERT INTO clients (client_id, client_name, total_invested) VALUES
    ('C001', 'Amit Sharma', 500000),
    ('C002', 'Priya Nair', 0),
    ('C003', 'Rohan Mehta', 0);`,

  `INSERT INTO model_funds (fund_id, fund_name, asset_class, allocation_pct) VALUES
    ('F001', 'Mirae Asset Large Cap Fund', 'EQUITY', 30),
    ('F002', 'Parag Parikh Flexi Cap Fund', 'EQUITY', 25),
    ('F003', 'HDFC Mid Cap Opportunities Fund', 'EQUITY', 20),
    ('F004', 'ICICI Prudential Bond Fund', 'DEBT', 15),
    ('F005', 'Nippon India Gold ETF', 'GOLD', 10);`,

  `INSERT INTO client_holdings (client_id, fund_id, fund_name, current_value) VALUES
    ('C001', 'F001', 'Mirae Asset Large Cap Fund', 90000),
    ('C001', 'F002', 'Parag Parikh Flexi Cap Fund', 155000),
    ('C001', 'F003', 'HDFC Mid Cap Opportunities Fund', 0),
    ('C001', 'F004', 'ICICI Prudential Bond Fund', 110000),
    ('C001', 'F005', 'Nippon India Gold ETF', 145000),
    ('C001', 'F006', 'Axis Bluechip Fund', 80000);
  `
];

let i = 0;
function runNext() {
  if (i >= statements.length) {
    console.log('Database initialized successfully.');
    return db.close();
  }
  const sql = statements[i++];
  db.run(sql, (err) => {
    if (err) {
      console.error('Error running SQL:', err.message);
      return db.close();
    }
    runNext();
  });
}

runNext();
