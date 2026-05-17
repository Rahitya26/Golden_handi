const express = require('express');
const router = express.Router();

// GET Dashboard Summary
router.get('/dashboard/summary', async (req, res) => {
  const db = req.app.get('db');
  const { startDate, endDate } = req.query;

  try {
    let dateFilter = '';
    let params = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE sale_date >= $1 AND sale_date <= $2';
      params = [startDate, endDate];
    }

    const salesQuery = `
      SELECT category, SUM(amount) as total
      FROM sales
      ${dateFilter}
      GROUP BY category
    `;
    const salesResult = await db.query(salesQuery, params);

    let expenseFilter = '';
    let purchaseFilter = '';
    if (startDate && endDate) {
      expenseFilter = 'WHERE expense_date >= $1 AND expense_date <= $2';
      purchaseFilter = 'WHERE purchase_date >= $1 AND purchase_date <= $2';
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
  const { startDate, endDate } = req.query;

  try {
    let dateFilter = 'category = $1';
    let params = [category];
    
    if (startDate && endDate) {
      dateFilter += ' AND sale_date >= $2 AND sale_date <= $3';
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
  const { amount, category, sub_category, sale_date } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO sales (amount, category, sub_category, sale_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [amount, category, sub_category, sale_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Expenses
router.get('/expenses', async (req, res) => {
  const db = req.app.get('db');
  const { startDate, endDate } = req.query;

  try {
    let dateFilter = '';
    let params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE expense_date >= $1 AND expense_date <= $2';
      params = [startDate, endDate];
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
  const { category, amount, description, expense_date } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO expenses (category, amount, description, expense_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [category, amount, description, expense_date]
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
  const items = req.body; // expected array of { category, amount, expense_date }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      await client.query(
        'INSERT INTO expenses (category, amount, description, expense_date) VALUES ($1, $2, $3, $4)',
        [item.category, item.amount, '', item.expense_date]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Bulk import successful', count: items.length });
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
  const { startDate, endDate } = req.query;

  try {
    let dateFilter = '';
    let params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE purchase_date >= $1 AND purchase_date <= $2';
      params = [startDate, endDate];
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
  const { category, amount, description, purchase_date } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO purchases (category, amount, description, purchase_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [category, amount, description, purchase_date]
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
  const items = req.body; // expected array of { category, amount, purchase_date }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      await client.query(
        'INSERT INTO purchases (category, amount, description, purchase_date) VALUES ($1, $2, $3, $4)',
        [item.category, item.amount, '', item.purchase_date]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Bulk import successful', count: items.length });
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
  const { startDate, endDate } = req.query;

  try {
    let dateFilter = '';
    let params = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE sale_date >= $1 AND sale_date <= $2';
      params = [startDate, endDate];
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
  const { startDate, endDate } = req.query;

  try {
    let dateFilterS = '';
    let dateFilterE = '';
    let dateFilterP = '';
    let params = [];
    if (startDate && endDate) {
      dateFilterS = 'WHERE sale_date >= $1 AND sale_date <= $2';
      dateFilterE = 'WHERE expense_date >= $1 AND expense_date <= $2';
      dateFilterP = 'WHERE purchase_date >= $1 AND purchase_date <= $2';
      params = [startDate, endDate];
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
  const { startDate, endDate } = req.query;

  try {
    let salesFilter = '';
    let purchaseFilter = '';
    let expenseFilter = '';
    let params = [];
    
    if (startDate && endDate) {
      salesFilter = 'WHERE sale_date >= $1 AND sale_date <= $2';
      purchaseFilter = 'WHERE purchase_date >= $1 AND purchase_date <= $2';
      expenseFilter = 'WHERE expense_date >= $1 AND expense_date <= $2';
      params = [startDate, endDate];
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

module.exports = router;
