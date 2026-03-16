const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('model_portfolio.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
  if (err) {
    console.error('ERROR', err);
  } else {
    console.log('TABLES:', rows.map(r => r.name));
  }
  db.close();
});
