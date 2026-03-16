import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav>
          <Link to="/">Comparison</Link>
          <Link to="/holdings">Current Investments</Link>
          <Link to="/history">History</Link>
          <Link to="/edit">Edit Plan</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Comparison />} />
          <Route path="/holdings" element={<Holdings />} />
          <Route path="/history" element={<History />} />
          <Route path="/edit" element={<EditPlan />} />
        </Routes>
      </div>
    </Router>
  );
}

function Comparison() {
  const [totalValue, setTotalValue] = useState(0);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/holdings').then(res => {
      const holdings = res.data;
      const total = holdings.reduce((sum, h) => sum + h.current_value, 0);
      setTotalValue(total);

      const recs = holdings.map(h => {
        const currentPct = (h.current_value / total) * 100;
        const targetPct = h.target_pct || 0;
        const drift = targetPct - currentPct;
        const amount = Math.abs((drift / 100) * total);
        const action = h.target_pct ? (drift > 0 ? 'BUY' : 'SELL') : 'REVIEW';
        return {
          fund_id: h.fund_id,
          fund_name: h.fund_name,
          target_pct: h.target_pct ? targetPct : null,
          current_pct: currentPct,
          drift: h.target_pct ? drift : null,
          action,
          amount,
          is_model_fund: !!h.target_pct
        };
      });
      setRecommendations(recs);
    });
  }, []);

  const totalBuy = recommendations.filter(r => r.action === 'BUY').reduce((sum, r) => sum + r.amount, 0);
  const totalSell = recommendations.filter(r => r.action === 'SELL').reduce((sum, r) => sum + r.amount, 0);
  const netCash = totalBuy - totalSell;

  const saveRebalance = () => {
    const items = recommendations.map(r => ({
      fund_id: r.fund_id,
      fund_name: r.fund_name,
      action: r.action,
      amount: r.amount,
      current_pct: r.current_pct,
      target_pct: r.target_pct,
      post_rebalance_pct: r.target_pct,
      is_model_fund: r.is_model_fund ? 1 : 0
    }));

    axios.post('http://localhost:5000/api/save-rebalance', {
      portfolio_value: totalValue,
      total_to_buy: totalBuy,
      total_to_sell: totalSell,
      net_cash_needed: netCash,
      items
    }).then(() => alert('Saved!'));
  };

  return (
    <div>
      <h1>Portfolio Comparison</h1>
      <table>
        <thead>
          <tr>
            <th>Fund</th>
            <th>Target %</th>
            <th>Current %</th>
            <th>Drift</th>
            <th>Action</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {recommendations.map(r => (
            <tr key={r.fund_id}>
              <td>{r.fund_name}</td>
              <td>{r.target_pct ? r.target_pct.toFixed(1) + '%' : '—'}</td>
              <td>{r.current_pct.toFixed(1)}%</td>
              <td>{r.drift ? r.drift.toFixed(1) : '—'}</td>
              <td>{r.action}</td>
              <td>Rs {r.amount.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <p>Total to BUY: Rs {totalBuy.toFixed(0)}</p>
        <p>Total to SELL: Rs {totalSell.toFixed(0)}</p>
        <p>Fresh money needed: Rs {netCash.toFixed(0)}</p>
      </div>
      <button onClick={saveRebalance}>Save Rebalancing Recommendation</button>
    </div>
  );
}

function Holdings() {
  const [holdings, setHoldings] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    axios.get('http://localhost:5000/api/holdings').then(res => {
      setHoldings(res.data);
      setTotal(res.data.reduce((sum, h) => sum + h.current_value, 0));
    });
  }, []);

  return (
    <div>
      <h1>Current Investments</h1>
      <ul>
        {holdings.map(h => (
          <li key={h.fund_id}>{h.fund_name}: Rs {h.current_value}</li>
        ))}
      </ul>
      <p>Total: Rs {total}</p>
    </div>
  );
}

function History() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/history').then(res => setHistory(res.data));
  }, []);

  return (
    <div>
      <h1>Rebalancing History</h1>
      {history.map(s => (
        <div key={s.session_id}>
          <h3>{s.created_at} - {s.status}</h3>
          <p>Portfolio Value: Rs {s.portfolio_value}</p>
          <p>Total Buy: Rs {s.total_to_buy}, Total Sell: Rs {s.total_to_sell}, Net: Rs {s.net_cash_needed}</p>
          <ul>
            {s.items.map(i => (
              <li key={i.fund_id}>{i.fund_name}: {i.action} Rs {i.amount}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function EditPlan() {
  const [funds, setFunds] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/model-funds').then(res => setFunds(res.data));
  }, []);

  const updateFund = (id, pct) => {
    setFunds(funds.map(f => f.fund_id === id ? { ...f, allocation_pct: pct } : f));
  };

  const save = () => {
    axios.put('http://localhost:5000/api/model-funds', funds).then(() => alert('Saved!'));
  };

  const total = funds.reduce((sum, f) => sum + parseFloat(f.allocation_pct || 0), 0);

  return (
    <div>
      <h1>Edit Recommended Plan</h1>
      {funds.map(f => (
        <div key={f.fund_id}>
          <label>{f.fund_name}</label>
          <input
            type="number"
            value={f.allocation_pct}
            onChange={e => updateFund(f.fund_id, e.target.value)}
          /> %
        </div>
      ))}
      <p>Total: {total}% {total !== 100 && <span style={{color: 'red'}}>Must be 100%</span>}</p>
      <button onClick={save} disabled={total !== 100}>Save</button>
    </div>
  );
}

export default App;
