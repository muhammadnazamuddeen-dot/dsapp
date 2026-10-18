import type { Context } from '@netlify/functions';
import serverless from 'serverless-http';
import { getUser, login, logout, acceptInvite, updateUser } from '@netlify/identity';
import { openDatabase } from '../../db/index.js';
import appModule from '../../src/app.js';

export default async (request: Request, context: Context) => {
  const path = new URL(request.url).pathname.replace(/^\/\.netlify\/functions\/api/, '');
  const db = await openDatabase();
  try {
    let identity = await getUser();
    const mutation = request.method === 'POST';
    // Identity email accounts coexist with society-created username accounts.
    if (mutation && ['/api/auth/login', '/api/auth/invite', '/api/auth/password'].includes(path)) {
      if (!request.headers.get('content-type')?.includes('application/json')) {
        return Response.json({ error: 'Expected a JSON request body.' }, { status: 415 });
      }
      if (Number(request.headers.get('content-length')) > 102400) return new Response(null, { status: 413 });
      let body;
      try { body = await request.clone().json(); } catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
      try {
        if (path.endsWith('/login') && String(body.username).includes('@')) {
          identity = await login(body.username, body.password);
        } else if (path.endsWith('/invite')) {
          if (typeof body.password !== 'string' || body.password.length < 8) return Response.json({ error: 'Use a password of at least 8 characters.' }, { status: 400 });
          await acceptInvite(body.token, body.password);
          return Response.json({ ok: true });
        } else if (path.endsWith('/password') && identity) {
          if (typeof body.new_password !== 'string' || body.new_password.length < 8 || body.new_password.length > 128) return Response.json({ error: 'Use a password between 8 and 128 characters.' }, { status: 400 });
          await login(identity.email, body.current_password);
          await updateUser({ password: body.new_password });
          await logout();
          return Response.json({ ok: true, message: 'Password updated. Please sign in again.' });
        }
      } catch {
        return Response.json({ error: 'Unable to sign in or update this account. Check your details and invitation.' }, { status: 401 });
      }
    }
    let identityUser = null;
    if (identity) {
      const role = identity.roles?.includes('admin') ? 'admin' : identity.roles?.includes('desk') ? 'desk' : null;
      if (!role) return Response.json({ error: 'Ask your administrator to assign the admin or desk role in Netlify Identity.' }, { status: 403 });
      await db.prepare(`INSERT INTO users (username, password_hash, full_name, role, identity_id)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT(identity_id) DO UPDATE SET role = excluded.role`).run(
        identity.email.toLowerCase(), 'identity', identity.name || identity.email, role, identity.id,
      );
      const row = await db.prepare('SELECT id, username, full_name, role, active FROM users WHERE identity_id = ?').get(identity.id);
      if (!row?.active) return Response.json({ error: 'This account is disabled.' }, { status: 403 });
      identityUser = { id: row.id, username: row.username, full_name: row.full_name, role: row.role };
      if (mutation && ['/api/auth/login', '/api/auth/invite'].includes(path)) return Response.json({ user: identityUser });
    }
    if (mutation && path === '/api/auth/logout' && identity) await logout();
    const app = appModule.createApp(db, { identityUser });
    const handler = serverless(app);
    const result = await handler({
      httpMethod: request.method,
      path,
      headers: Object.fromEntries(request.headers),
      queryStringParameters: Object.fromEntries(new URL(request.url).searchParams),
      multiValueQueryStringParameters: {},
      body: ['GET', 'HEAD'].includes(request.method) ? null : await request.text(),
      isBase64Encoded: false,
      requestContext: { identity: { sourceIp: context.ip } },
    }, {}) as { statusCode: number; headers: Record<string, string>; multiValueHeaders?: Record<string, string[]>; body: string; isBase64Encoded?: boolean };
    const headers = new Headers(result.headers as Record<string, string>);
    for (const value of result.multiValueHeaders?.['set-cookie'] || []) headers.append('set-cookie', value);
    headers.set('Cache-Control', 'no-store');
    return new Response(result.isBase64Encoded ? Buffer.from(result.body, 'base64') : result.body, { status: result.statusCode, headers });
  } catch (error) {
    console.error('API request failed', error instanceof Error ? error.name : 'UnknownError');
    return Response.json({ error: 'The server could not complete this request. Please try again.' }, { status: 500 });
  } finally { await db.close(); }
};
