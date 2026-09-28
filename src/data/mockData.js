export const projects = [
  {
    name: 'payments-api',
    meta: 'Node.js · main',
    risk: 82,
    tone: 'danger',
  },
  {
    name: 'auth-service',
    meta: 'Go · release/2.4',
    risk: 68,
    tone: 'warn',
  },
  {
    name: 'admin-console',
    meta: 'TypeScript · develop',
    risk: 21,
    tone: 'safe',
  },
];

export const files = [
  'routes',
  'users.ts',
  'payments.ts',
  'database.ts',
  'middleware.ts',
  'tests',
  'package.json',
];

export const codeLines = [
  "import express from 'express';",
  "import db from './database';",
  '',
  "app.get('/api/users', async (req, res) => {",
  '  const userId = req.query.id;',
  '  const query = `SELECT * FROM users WHERE id = ${userId}`;',
  '  const result = await db.query(query);',
  '  res.json(result.rows);',
  '});',
];

export const fixedLines = [
  'const userId = validateUserId(req.query.id);',
  "const query = 'SELECT * FROM users WHERE id = $1';",
  'const result = await db.query(query, [userId]);',
];
