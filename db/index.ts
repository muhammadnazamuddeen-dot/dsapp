import { getDatabase } from '@netlify/database';
import { drizzle } from 'drizzle-orm/netlify-db';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';

// Each invocation reserves a connection so registration transactions cannot mix
// statements from concurrent requests.
export async function openDatabase() {
  const client = await getDatabase().pool.connect();
  return createDatabase(client);
}

export function createDatabase(client: any) {
  const orm = drizzle({ client: { driver: 'server', pool: client, connectionString: '' }, schema });
  async function query(statement: string, values: unknown[] = []) {
    const parts = statement.split('?');
    if (parts.length !== values.length + 1) throw new Error('Invalid query parameters');
    const chunks = [sql.raw(parts[0])];
    values.forEach((value, i) => { chunks.push(sql`${value}`, sql.raw(parts[i + 1])); });
    try {
      return await orm.execute(sql.join(chunks, sql.raw('')));
    } catch (error) {
      // Preserve Postgres constraint codes for the route's conflict responses.
      if (error.cause?.code) throw error.cause;
      throw error;
    }
  }
  return {
    prepare(statement: string) {
      // Retain the existing route interface while executing parameterized Postgres SQL.
      const translated = statement.replace(/\bLIKE\b/g, 'ILIKE');
      return {
        async all(...values: unknown[]) { return (await query(translated, values)).rows; },
        async get(...values: unknown[]) { return (await query(translated, values)).rows[0]; },
        async run(...values: unknown[]) {
          const inserting = /^\s*INSERT INTO (users|members)\b/i.test(translated);
          const result = await query(translated + (inserting ? ' RETURNING id' : ''), values);
          return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
        },
      };
    },
    async exec(statement: string) { await query(statement === 'BEGIN IMMEDIATE' ? 'BEGIN' : statement); },
    async close() {
      try { await client.query('ROLLBACK'); } finally { client.release(); }
    },
  };
}
