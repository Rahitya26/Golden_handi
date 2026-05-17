const express = require('express');
const cors = require('express');
const app = express();
const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    };

const pool = new Pool(poolConfig);

app.use(require('cors')());
app.use(express.json());

// Expose pool to routes
app.set('db', pool);

// Import and use routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5001;

// Only start the server locally, Vercel will use the exported app
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel Serverless Function
module.exports = app;
