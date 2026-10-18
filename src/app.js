'use strict';

const path = require('node:path');
const express = require('express');
const { getSettings } = require('./db');
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const adminRoutes = require('./routes/admin');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
    );
    next();
  });

  // State-changing API calls must be JSON, which cross-site HTML forms cannot send.
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const contentType = String(req.headers['content-type'] || '');
      if (!contentType.includes('application/json')) {
        return res.status(415).json({ error: 'Expected a JSON request body.' });
      }
    }
    next();
  });

  // Public branding for the sign-in screen; register it before the guarded routers.
  app.get('/api/brand', (req, res) => {
    const settings = getSettings(db);
    res.json({ brand: { society_name: settings.society_name, tagline: settings.tagline } });
  });

  app.use('/api/auth', authRoutes(db));
  app.use('/api', memberRoutes(db));
  app.use('/api', adminRoutes(db));

  app.use(
    express.static(PUBLIC_DIR, {
      index: false,
      maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
    })
  );

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
    res.status(404).type('text/plain').send('Not found');
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large.' });
    }
    console.error('[error]', error);
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
    res.status(500).type('text/plain').send('Something went wrong.');
  });

  return app;
}

module.exports = { createApp };
