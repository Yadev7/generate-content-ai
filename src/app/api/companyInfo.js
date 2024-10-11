// pages/api/companyInfo.js

import { Pool } from 'mysql2/promise';

const pool = new Pool({
  user: 'root',
  host: 'localhost',
  database: 'command-bot-db',
  password: '',
  port: 3306 // Default MySQL port
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { query } = req.body;

    try {
      const result = await pool.query('SELECT * FROM companies WHERE company_name ILIKE $1', [`%${query}%`]);
      const companyData = result.rows;

      res.status(200).json(companyData);
    } catch (error) {
      console.error('Error fetching data from the database:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
