'use strict';

const path = require('node:path');
const { createDb } = require('./src/db');
const { createApp } = require('./src/app');

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '127.0.0.1';
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'society.db');

const db = createDb(dbPath);
const app = createApp(db);

const server = app.listen(port, host, () => {
  console.log('');
  console.log('  Debating Society registration desk');
  console.log(`  Running at http://${host}:${port}`);
  console.log(`  Database: ${path.resolve(dbPath)}`);
  console.log('');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Set PORT to a different value.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

function shutdown() {
  server.close(() => {
    try {
      db.close();
    } catch {
      /* already closed */
    }
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
