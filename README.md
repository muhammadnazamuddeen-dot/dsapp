# Debating Society — Membership Desk

A small, self-contained registration and payments app for a debating society. Desk members
register general and executive members, record online or cash payments, and print receipts.
Admins additionally manage accounts, money settings and the roster export.

Built with Node.js, Express and SQLite. No build step, no external services required.

![flow](https://img.shields.io/badge/roles-admin%20%2B%20desk-0f1a2b) ![payments](https://img.shields.io/badge/payments-online%20%2B%20offline-b8892f)

## Quick start

Requires **Node.js 22.5 or newer** (the app uses the built-in `node:sqlite` module).

```bash
npm install
npm start
```

Open <http://127.0.0.1:3000>.

The first run creates `data/society.db` and seeds one admin and one desk account. Choose their
credentials with the `ADMIN_USERNAME` / `ADMIN_PASSWORD` and `DESK_USERNAME` / `DESK_PASSWORD`
environment variables before the first start, then change both passwords from **Settings** after
signing in.

In production (`NODE_ENV=production`), both passwords are required on the first run: the app
refuses to seed an empty database without them. Locally, the development defaults in `src/db.js`
are used.

### Configuration

Environment variables (all optional):

| Variable         | Default              | Purpose                                   |
|------------------|----------------------|-------------------------------------------|
| `PORT`           | `3000`               | HTTP port                                 |
| `HOST`           | `127.0.0.1`          | Bind address (`0.0.0.0` to expose on LAN) |
| `DB_PATH`        | `data/society.db`    | SQLite database file                      |
| `ADMIN_USERNAME` | `admin`              | Seed admin username (first run only)      |
| `ADMIN_PASSWORD` | Set before first run | Seed admin password (first run only)      |
| `DESK_USERNAME`  | `desk1`              | Seed desk username (first run only)       |
| `DESK_PASSWORD`  | Set before first run | Seed desk password (first run only)       |

Example:

```bash
PORT=8080 ADMIN_PASSWORD='a-long-secret' DESK_PASSWORD='another-long-secret' npm start
```

## Deployment

The app needs a host that runs a long-lived Node.js process and provides a writable disk.
Static/serverless platforms such as Netlify and Vercel are not suitable: they do not keep
`data/society.db` or SQLite-backed sessions between requests.

### Render

The repository includes a `render.yaml` Blueprint and pins Node.js 24 via `.node-version`.

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint** and connect the repository.
3. When prompted, enter `ADMIN_PASSWORD` and `DESK_PASSWORD`. They create the first accounts and
   are required on the first production start.
4. Apply the Blueprint. Render runs `npm ci`, starts `npm start`, and mounts a 1 GB disk at
   `/var/data`; SQLite stores the database at `/var/data/society.db`.
5. Open the service URL and sign in with the admin and desk usernames you configured. Change both
   passwords from **Settings**.

A persistent disk requires a paid Render instance. The free plan has an ephemeral filesystem, so
member data would be lost on each deploy or restart. Render snapshots the disk daily; export CSV
regularly as an additional backup.

## What each role can do

**Admin**
- Everything a desk member can do
- Add, disable, re-enable and password-reset desk/admin accounts
- Delete member records
- Export the filtered roster as CSV
- Change society name, tagline, currency symbol and both membership fees

**Desk member**
- Register general and executive members
- Search and view the roster
- Record online or cash payments and print receipts

## Registration and payment flow

1. **Member details** — name, department, roll number and contact number. Roll numbers are
   unique and case-insensitive.
2. **Membership plan** — General or Executive; the fee is taken from Settings at registration
   time and stored on the record. Changing fees later never rewrites existing members.
3. **Payment** — choose *At the desk* or *Online*, then *Paid* or *Pending*.
   - Offline payments are cash collected by the desk.
   - Online payments are recorded with a transaction reference (bKash/Nagad/bank reference).
   - A pending payment can be completed later from the member record, including a one-click
     **demo gateway** that generates a test `TXN-…` reference.
4. **Receipt** — a printable receipt with member ID, its own receipt serial, fee, payment method
   and status is generated for every registration.

Each member gets a sequential ID such as `DS-2026-0001`, and every receipt gets its own serial
such as `RCPT-2026-0001`. Older databases are upgraded automatically and back-filled with
receipt serials the next time the app starts.

Admins can download the filtered roster from **Members → Export CSV**. The export includes the
receipt serial, member ID, fee, payment status, transaction reference, registering desk member
and dates. Desk accounts do not see the button and are rejected by the server if they call the
export endpoint directly.

## Online payment gateway

The app deliberately does **not** hold third-party payment credentials. The demo checkout is the
`POST /api/members/:id/pay-online` endpoint in `src/routes/members.js`; it marks a payment paid and
generates a reference.

To take live payments, integrate a gateway (bKash, Nagad, SSLCommerz, Razorpay, Stripe, …) in
front of that route:

1. Create a payment intent/session for `member.amount` from the server.
2. Redirect the member to the gateway's hosted checkout.
3. Mark the member paid **only** in the gateway's signed webhook/callback after verifying the
   signature and amount — never from a browser redirect alone.
4. Store the gateway transaction ID in `transaction_ref` and keep `paid_at` accurate.

The desk-recorded "online" mode remains useful for bank transfers or wallets that are confirmed
manually.

## Tests

```bash
npm test
```

Runs integration tests against a temporary SQLite database covering login and sessions, member
creation and validation, duplicate roll numbers, online/offline payment recording, role
restrictions, account management, settings, CSV export and password changes.

## Project layout

```
server.js                HTTP server and DB bootstrap
src/db.js                Schema, seed data, settings and member-code counters
src/auth.js              scrypt password hashing, cookie sessions, role guards
src/app.js               Express setup, security headers, public brand endpoint
src/routes/auth.js       Login, logout, current user, password change
src/routes/members.js    Registration, listing, payments, stats, CSV export
src/routes/admin.js      User accounts and society settings
src/validate.js          Input normalization and validation
public/index.html        App shell
public/app.js            Session bootstrap, shell and hash router
public/api.js            JSON API client
public/ui.js             Formatting, icons, modals, toasts
public/views/*.js        Login, dashboard, registration, members, accounts, settings
public/styles.css        Design system and responsive styles
test/app.test.js         API integration tests
```

## Security notes

- Passwords are hashed with scrypt; sessions are random 256-bit tokens stored hashed in SQLite.
- Session cookies are `HttpOnly`, `SameSite=Lax` and become `Secure` behind HTTPS.
- All member, payment, account and settings endpoints require a session; admin-only routes are
  checked server-side, not just hidden in the UI.
- Mutating API requests must be JSON, which blocks simple cross-site form posts.
- Login attempts are rate-limited (10 failures per username/IP per 10 minutes).
- All user data is HTML-escaped before rendering; a strict Content-Security-Policy is set.
- Back up `data/society.db` (and its `-wal`/`-shm` files) or export CSV regularly.

## Notes

- Currency symbol defaults to `৳` and is configurable in Settings.
- Fees are stored as whole currency units.
- Receipts print through the browser's print dialog; choose "Save as PDF" for a digital copy.
