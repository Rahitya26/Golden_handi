const express = require('express');
const router = express.Router();

// GET Dashboard Summary
router.get('/dashboard/summary', async (req, res) => {
  const db = req.app.get('db');
  const { startDate, endDate, branch } = req.query;

  try {
    let dateFilter = "WHERE branch = $1";
    let params = [branch || 'Golden Handi (G.H)'];
    
    if (startDate && endDate) {
      dateFilter += " AND sale_date >= $2 AND sale_date <= $3";
      params.push(startDate, endDate);
    }

    const salesQuery = `
      SELECT category, SUM(amount) as total
      FROM sales
      ${dateFilter}
      GROUP BY category
    `;
    const salesResult = await db.query(salesQuery, params);

    let expenseFilter = "WHERE branch = $1";
    let purchaseFilter = "WHERE branch = $1";
    if (startDate && endDate) {
      expenseFilter += " AND expense_date >= $2 AND expense_date <= $3";
      purchaseFilter += " AND purchase_date >= $2 AND purchase_date <= $3";
    }

    const expenseQuery = `SELECT SUM(amount) as total FROM expenses ${expenseFilter}`;
    const expenseResult = await db.query(expenseQuery, params);

    const purchaseQuery = `SELECT SUM(amount) as total FROM purchases ${purchaseFilter}`;
    const purchaseResult = await db.query(purchaseQuery, params);

    const summary = {
      'Tea Counter': 0,
      'Restaurant': 0,
      'Online': 0,
      'Expenses': expenseResult.rows[0].total || 0,
      'Purchases': purchaseResult.rows[0].total || 0,
    };

    salesResult.rows.forEach(row => {
      summary[row.category] = row.total;
    });

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Category Breakdown
router.get('/dashboard/breakdown/:category', async (req, res) => {
  const db = req.app.get('db');
  const { category } = req.params;
  const { startDate, endDate, branch } = req.query;

  try {
    let dateFilter = "category = $1 AND branch = $2";
    let params = [category, branch || 'Golden Handi (G.H)'];
    
    if (startDate && endDate) {
      dateFilter += " AND sale_date >= $3 AND sale_date <= $4";
      params.push(startDate, endDate);
    }

    const breakdownQuery = `
      SELECT sub_category, SUM(amount) as total
      FROM sales
      WHERE ${dateFilter}
      GROUP BY sub_category
    `;
    const result = await db.query(breakdownQuery, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Add Sale
router.post('/sales', async (req, res) => {
  const db = req.app.get('db');
  const { amount, category, sub_category, sale_date, branch } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO sales (amount, category, sub_category, sale_date, branch) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [amount, category, sub_category, sale_date, branch || 'Golden Handi (G.H)']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Bulk Add Sales
router.post('/sales/bulk', async (req, res) => {
  const db = req.app.get('db');
  const items = req.body.items || req.body; // allow wrapped or array
  const branch = req.body.branch || 'Golden Handi (G.H)';

  let targetItems = Array.isArray(items) ? items : (Array.isArray(req.body) ? req.body : null);

  if (!targetItems || targetItems.length === 0) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const item of targetItems) {
      await client.query(
        'INSERT INTO sales (amount, category, sub_category, sale_date, branch) VALUES ($1, $2, $3, $4, $5)',
        [item.amount, item.category, item.sub_category, item.sale_date, branch]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Bulk import successful', count: targetItems.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk insert error:', error);
    res.status(500).json({ error: 'Bulk import failed' });
  } finally {
    client.release();
  }
});

// GET Expenses
router.get('/expenses', async (req, res) => {
  const db = req.app.get('db');
  const { startDate, endDate, branch } = req.query;

  try {
    let dateFilter = 'WHERE branch = $1';
    let params = [branch || 'Golden Handi (G.H)'];
    
    if (startDate && endDate) {
      dateFilter += ' AND expense_date >= $2 AND expense_date <= $3';
      params.push(startDate, endDate);
    }

    const query = `
      SELECT 
        category, 
        SUM(amount) as amount, 
        MAX(expense_date) as expense_date,
        COUNT(*) as entry_count
      FROM expenses 
      ${dateFilter} 
      GROUP BY category
      ORDER BY category ASC
    `;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Add Expense
router.post('/expenses', async (req, res) => {
  const db = req.app.get('db');
  const { category, amount, description, expense_date, branch } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO expenses (category, amount, description, expense_date, branch) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [category, amount, description, expense_date, branch || 'Golden Handi (G.H)']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Bulk Add Expenses
router.post('/expenses/bulk', async (req, res) => {
  const db = req.app.get('db');
  const items = req.body.items || req.body; 
  const branch = req.body.branch || 'Golden Handi (G.H)';

  let targetItems = Array.isArray(items) ? items : (Array.isArray(req.body) ? req.body : null);

  if (!targetItems || targetItems.length === 0) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const item of targetItems) {
      await client.query(
        'INSERT INTO expenses (category, amount, description, expense_date, branch) VALUES ($1, $2, $3, $4, $5)',
        [item.category, item.amount, '', item.expense_date, branch]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Bulk import successful', count: targetItems.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk insert error:', error);
    res.status(500).json({ error: 'Bulk import failed' });
  } finally {
    client.release();
  }
});

// GET Purchases
router.get('/purchases', async (req, res) => {
  const db = req.app.get('db');
  const { startDate, endDate, branch } = req.query;

  try {
    let dateFilter = 'WHERE branch = $1';
    let params = [branch || 'Golden Handi (G.H)'];
    
    if (startDate && endDate) {
      dateFilter += ' AND purchase_date >= $2 AND purchase_date <= $3';
      params.push(startDate, endDate);
    }

    const query = `
      SELECT 
        category, 
        SUM(amount) as amount, 
        MAX(purchase_date) as purchase_date,
        COUNT(*) as entry_count
      FROM purchases 
      ${dateFilter} 
      GROUP BY category
      ORDER BY category ASC
    `;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Add Purchase
router.post('/purchases', async (req, res) => {
  const db = req.app.get('db');
  const { category, amount, description, purchase_date, branch } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO purchases (category, amount, description, purchase_date, branch) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [category, amount, description, purchase_date, branch || 'Golden Handi (G.H)']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Bulk Add Purchases
router.post('/purchases/bulk', async (req, res) => {
  const db = req.app.get('db');
  const items = req.body.items || req.body; 
  const branch = req.body.branch || 'Golden Handi (G.H)';

  let targetItems = Array.isArray(items) ? items : (Array.isArray(req.body) ? req.body : null);

  if (!targetItems || targetItems.length === 0) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const item of targetItems) {
      await client.query(
        'INSERT INTO purchases (category, amount, description, purchase_date, branch) VALUES ($1, $2, $3, $4, $5)',
        [item.category, item.amount, '', item.purchase_date, branch]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Bulk import successful', count: targetItems.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk insert error:', error);
    res.status(500).json({ error: 'Bulk import failed' });
  } finally {
    client.release();
  }
});

// GET Chart Data
router.get('/dashboard/chart', async (req, res) => {
  const db = req.app.get('db');
  const { startDate, endDate, branch } = req.query;

  try {
    let dateFilter = 'WHERE branch = $1';
    let params = [branch || 'Golden Handi (G.H)'];
    if (startDate && endDate) {
      dateFilter += ' AND sale_date >= $2 AND sale_date <= $3';
      params.push(startDate, endDate);
    }

    const query = `
      SELECT 
        sale_date as date,
        SUM(CASE WHEN category = 'Tea Counter' THEN amount ELSE 0 END) as "Tea",
        SUM(CASE WHEN category = 'Restaurant' THEN amount ELSE 0 END) as "Restaurant",
        SUM(CASE WHEN category = 'Online' THEN amount ELSE 0 END) as "Online"
      FROM sales
      ${dateFilter}
      GROUP BY sale_date
      ORDER BY sale_date ASC
    `;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Profit Chart Data
router.get('/dashboard/profit-chart', async (req, res) => {
  const db = req.app.get('db');
  const { startDate, endDate, branch } = req.query;

  try {
    let dateFilterS = 'WHERE branch = $1';
    let dateFilterE = 'WHERE branch = $1';
    let dateFilterP = 'WHERE branch = $1';
    let params = [branch || 'Golden Handi (G.H)'];

    if (startDate && endDate) {
      dateFilterS += ' AND sale_date >= $2 AND sale_date <= $3';
      dateFilterE += ' AND expense_date >= $2 AND expense_date <= $3';
      dateFilterP += ' AND purchase_date >= $2 AND purchase_date <= $3';
      params.push(startDate, endDate);
    }

    const query = `
      WITH dates AS (
        SELECT sale_date as date FROM sales ${dateFilterS}
        UNION
        SELECT expense_date as date FROM expenses ${dateFilterE}
        UNION
        SELECT purchase_date as date FROM purchases ${dateFilterP}
      ),
      daily_sales AS (
        SELECT sale_date as date, SUM(amount) as sales
        FROM sales ${dateFilterS}
        GROUP BY sale_date
      ),
      daily_expenses AS (
        SELECT expense_date as date, SUM(amount) as expenses
        FROM expenses ${dateFilterE}
        GROUP BY expense_date
      ),
      daily_purchases AS (
        SELECT purchase_date as date, SUM(amount) as purchases
        FROM purchases ${dateFilterP}
        GROUP BY purchase_date
      )
      SELECT 
        d.date,
        COALESCE(s.sales, 0) as sales,
        (COALESCE(e.expenses, 0) + COALESCE(p.purchases, 0)) as outflow,
        (COALESCE(s.sales, 0) - (COALESCE(e.expenses, 0) + COALESCE(p.purchases, 0))) as profits
      FROM dates d
      LEFT JOIN daily_sales s ON d.date = s.date
      LEFT JOIN daily_expenses e ON d.date = e.date
      LEFT JOIN daily_purchases p ON d.date = p.date
      ORDER BY d.date ASC
    `;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Report Data
router.get('/dashboard/report-data', async (req, res) => {
  const db = req.app.get('db');
  const { startDate, endDate, branch } = req.query;

  try {
    let salesFilter = 'WHERE branch = $1';
    let purchaseFilter = 'WHERE branch = $1';
    let expenseFilter = 'WHERE branch = $1';
    let params = [branch || 'Golden Handi (G.H)'];
    
    if (startDate && endDate) {
      salesFilter += ' AND sale_date >= $2 AND sale_date <= $3';
      purchaseFilter += ' AND purchase_date >= $2 AND purchase_date <= $3';
      expenseFilter += ' AND expense_date >= $2 AND expense_date <= $3';
      params.push(startDate, endDate);
    }

    const salesResult = await db.query(
      `SELECT category, SUM(amount) as total FROM sales ${salesFilter} GROUP BY category`,
      params
    );

    const purchasesResult = await db.query(
      `SELECT category, SUM(amount) as total FROM purchases ${purchaseFilter} GROUP BY category`,
      params
    );

    const expensesResult = await db.query(
      `SELECT category, SUM(amount) as total FROM expenses ${expenseFilter} GROUP BY category`,
      params
    );

    res.json({
      sales: salesResult.rows,
      purchases: purchasesResult.rows,
      expenses: expensesResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =======================
// Edit/Delete Routes
// =======================

// GET Daily Sales Breakdown
router.get('/sales/daily', async (req, res) => {
  const db = req.app.get('db');
  const { startDate, endDate, branch, category } = req.query;

  try {
    let dateFilter = "category = $1 AND branch = $2";
    let params = [category, branch || 'Golden Handi (G.H)'];
    
    if (startDate && endDate) {
      dateFilter += " AND sale_date >= $3 AND sale_date <= $4";
      params.push(startDate, endDate);
    }

    const query = `
      SELECT 
        sale_date,
        sub_category,
        SUM(amount) as total
      FROM sales
      WHERE ${dateFilter}
      GROUP BY sale_date, sub_category
      ORDER BY sale_date DESC
    `;
    const result = await db.query(query, params);
    
    const pivoted = {};
    result.rows.forEach(row => {
      // Need to pad correctly, db returns date object or string. We just use it directly or format it.
      // We will let frontend format it, but group by string value.
      // In JS, node-postgres parses DATE to a JS Date at midnight local time.
      // So we use string manipulation to extract YYYY-MM-DD
      const d = new Date(row.sale_date);
      const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      
      if (!pivoted[dateStr]) pivoted[dateStr] = { sale_date: dateStr, total: 0 };
      pivoted[dateStr][row.sub_category] = Number(row.total);
      pivoted[dateStr].total += Number(row.total);
    });

    res.json(Object.values(pivoted));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT Daily Sales
router.put('/sales/daily', async (req, res) => {
  const db = req.app.get('db');
  const { sale_date, category, branch, updates } = req.body;
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM sales WHERE sale_date = $1 AND category = $2 AND branch = $3',
      [sale_date, category, branch || 'Golden Handi (G.H)']
    );
    
    for (const [subCat, amount] of Object.entries(updates)) {
      const numAmount = Number(amount);
      if (numAmount > 0) {
        await client.query(
          'INSERT INTO sales (amount, category, sub_category, sale_date, branch) VALUES ($1, $2, $3, $4, $5)',
          [numAmount, category, subCat, sale_date, branch || 'Golden Handi (G.H)']
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to update daily sales' });
  } finally {
    client.release();
  }
});

// DELETE Daily Sales
router.delete('/sales/daily', async (req, res) => {
  const db = req.app.get('db');
  const { sale_date, category, branch } = req.body;
  
  try {
    await db.query(
      'DELETE FROM sales WHERE sale_date = $1 AND category = $2 AND branch = $3',
      [sale_date, category, branch || 'Golden Handi (G.H)']
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete daily sales' });
  }
});

// PUT Expenses Aggregated
router.put('/expenses/aggregated', async (req, res) => {
  const db = req.app.get('db');
  const { category, branch, startDate, endDate, amount, expense_date } = req.body;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    let deleteQuery = 'DELETE FROM expenses WHERE category = $1 AND branch = $2';
    let params = [category, branch || 'Golden Handi (G.H)'];
    if (startDate && endDate) {
      deleteQuery += ' AND expense_date >= $3 AND expense_date <= $4';
      params.push(startDate, endDate);
    }
    await client.query(deleteQuery, params);
    
    await client.query(
      'INSERT INTO expenses (category, amount, description, expense_date, branch) VALUES ($1, $2, $3, $4, $5)',
      [category, amount, '', expense_date, branch || 'Golden Handi (G.H)']
    );
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to update expenses' });
  } finally {
    client.release();
  }
});

// DELETE Expenses Aggregated
router.delete('/expenses/aggregated', async (req, res) => {
  const db = req.app.get('db');
  const { category, branch, startDate, endDate } = req.body;

  try {
    let deleteQuery = 'DELETE FROM expenses WHERE category = $1 AND branch = $2';
    let params = [category, branch || 'Golden Handi (G.H)'];
    if (startDate && endDate) {
      deleteQuery += ' AND expense_date >= $3 AND expense_date <= $4';
      params.push(startDate, endDate);
    }
    await db.query(deleteQuery, params);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete expenses' });
  }
});

// PUT Purchases Aggregated
router.put('/purchases/aggregated', async (req, res) => {
  const db = req.app.get('db');
  const { category, branch, startDate, endDate, amount, purchase_date } = req.body;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    let deleteQuery = 'DELETE FROM purchases WHERE category = $1 AND branch = $2';
    let params = [category, branch || 'Golden Handi (G.H)'];
    if (startDate && endDate) {
      deleteQuery += ' AND purchase_date >= $3 AND purchase_date <= $4';
      params.push(startDate, endDate);
    }
    await client.query(deleteQuery, params);
    
    await client.query(
      'INSERT INTO purchases (category, amount, description, purchase_date, branch) VALUES ($1, $2, $3, $4, $5)',
      [category, amount, '', purchase_date, branch || 'Golden Handi (G.H)']
    );
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to update purchases' });
  } finally {
    client.release();
  }
});

// DELETE Purchases Aggregated
router.delete('/purchases/aggregated', async (req, res) => {
  const db = req.app.get('db');
  const { category, branch, startDate, endDate } = req.body;

  try {
    let deleteQuery = 'DELETE FROM purchases WHERE category = $1 AND branch = $2';
    let params = [category, branch || 'Golden Handi (G.H)'];
    if (startDate && endDate) {
      deleteQuery += ' AND purchase_date >= $3 AND purchase_date <= $4';
      params.push(startDate, endDate);
    }
    await db.query(deleteQuery, params);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete purchases' });
  }
});

module.exports = router;
