/**
 * One-off migration: classify existing payments, and reconstruct authorization
 * payments that were never recorded.
 *
 * Why this exists
 * ---------------
 * A subscription's upfront authorization charge was only ever written to the
 * `payments` collection by the SUBSCRIPTION_AUTH_STATUS webhook. But access is
 * granted by SUBSCRIPTION_STATUS_CHANGED→ACTIVE, which recorded no payment. When
 * only the latter arrived, the subscriber ended up active with real money paid and
 * no Payment row: invisible in the Finance tab, and — worse — indistinguishable
 * from a non-payer to /api/admin/cleanup-stale, which demotes such users to
 * 'expired' and costs them their Discord role.
 *
 * src/app/api/cashfree/webhook/route.ts now records the auth payment from either
 * event via an idempotent upsert. This script repairs the rows already lost, and
 * backfills `kind` so that upsert has something to match on for old subscriptions.
 *
 * What it does
 * ------------
 *  1. Classifies every existing payment: the earliest successful payment of each
 *     subscription is its authorization ('auth'); everything else is a 'charge'.
 *  2. Creates the missing auth payment for any active, non-lifetime subscriber that
 *     has no successful payment at all. Amount comes from the plan catalog
 *     (src/lib/plans.ts) — authoritative, because auth charges the full plan amount
 *     upfront. Dated from the user's earliest 'subscribed' audit entry so it lands
 *     on the day they actually paid, not today.
 *  3. Ensures the partial unique index that keeps auth payments idempotent.
 *
 * Run:
 *   node --experimental-strip-types scripts/backfill-auth-payments.mjs           # dry run
 *   node --experimental-strip-types scripts/backfill-auth-payments.mjs --apply   # write
 *
 * (The strip-types flag is needed because this imports the TypeScript plan catalog
 * rather than duplicating the prices.)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { getPlan } from '../src/lib/plans.ts';

// ── load env ──────────────────────────────────────────────────────────────
for (const file of ['.env.local', '.env']) {
  try {
    const text = readFileSync(resolve(process.cwd(), file), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // file absent — fine
  }
}

const APPLY = process.argv.includes('--apply');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');

console.log(APPLY ? '*** APPLY MODE — writes are real ***\n' : '--- DRY RUN (pass --apply to write) ---\n');

await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
const db = mongoose.connection.db;
const Payments = db.collection('payments');
const Users = db.collection('users');
const AuditLogs = db.collection('auditlogs');

// ── 1. classify existing payments ─────────────────────────────────────────
const all = await Payments.find({}).toArray();
const bySub = new Map();
for (const p of all.filter((p) => p.status === 'success')) {
  if (!bySub.has(p.cashfreeSubscriptionId)) bySub.set(p.cashfreeSubscriptionId, []);
  bySub.get(p.cashfreeSubscriptionId).push(p);
}

const authIds = [];
for (const [, rows] of bySub) {
  rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  authIds.push(rows[0]._id); // earliest success = the authorization
}
const authIdSet = new Set(authIds.map(String));
const chargeIds = all.filter((p) => !authIdSet.has(String(p._id))).map((p) => p._id);

console.log('1. CLASSIFY');
console.log(`   auth   → ${authIds.length} rows (earliest successful payment per subscription)`);
console.log(`   charge → ${chargeIds.length} rows (recurring charges, failures, duplicates)`);

if (APPLY) {
  if (chargeIds.length) await Payments.updateMany({ _id: { $in: chargeIds } }, { $set: { kind: 'charge' } });
  if (authIds.length) await Payments.updateMany({ _id: { $in: authIds } }, { $set: { kind: 'auth' } });
  console.log('   ✓ applied');
}

// ── 2. backfill missing auth payments ─────────────────────────────────────
console.log('\n2. BACKFILL MISSING AUTH PAYMENTS');
const paidUserIds = new Set(all.filter((p) => p.status === 'success').map((p) => String(p.userId)));
const targets = await Users.find({
  subscriptionStatus: 'active',
  lifetime: { $ne: true },
  cashfreeSubscriptionId: { $ne: null },
}).toArray();

let created = 0;
let skipped = 0;
for (const user of targets) {
  if (paidUserIds.has(String(user._id))) continue; // already has a payment on record

  const plan = getPlan(user.plan ?? '');
  if (!plan) {
    console.log(`   SKIP ${user.email} — unknown/legacy plan "${user.plan}", refusing to guess an amount`);
    skipped++;
    continue;
  }

  // Date it from when they actually paid, not now — otherwise Finance still shows a
  // gap on the real day and a phantom transaction today.
  const firstLog = await AuditLogs.find({
    userEmail: user.email,
    action: { $in: ['subscribed', 'payment_success'] },
  }).sort({ createdAt: 1 }).limit(1).next();
  const paidAt = firstLog ? new Date(firstLog.createdAt) : new Date(user.createdAt);

  console.log(`   ${APPLY ? 'CREATE' : 'WOULD CREATE'} ${user.email}`);
  console.log(`       plan=${plan.key} amount=₹${plan.amount} paidAt=${paidAt.toISOString()}`);
  console.log(`       sub=${user.cashfreeSubscriptionId}  cfPaymentId=(unknown — reconstructed, not fetched)`);

  if (APPLY) {
    // Raw insert so createdAt reflects the real payment date; mongoose timestamps
    // would stamp it "now" and the Finance date filter reads createdAt.
    await Payments.insertOne({
      userId: user._id,
      cashfreeSubscriptionId: user.cashfreeSubscriptionId,
      amount: plan.amount,
      status: 'success',
      kind: 'auth',
      paidAt,
      // Left null deliberately: we never saw Cashfree's payment id for this charge.
      // Finance renders it as "—", and a redelivered webhook will fill it in via the
      // upsert rather than inserting a second row.
      cfPaymentId: null,
      createdAt: paidAt,
      updatedAt: new Date(),
    });

    await AuditLogs.insertOne({
      userId: user._id,
      userEmail: user.email,
      action: 'payment_success',
      details:
        `Backfilled authorization payment ₹${plan.amount} (${plan.key}) dated ${paidAt.toISOString().slice(0, 10)} — ` +
        `the original webhook granted access but never recorded the payment`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  created++;
}
if (created === 0 && skipped === 0) console.log('   nothing to backfill');

// ── 3. ensure the idempotency index ───────────────────────────────────────
console.log('\n3. INDEX');
if (APPLY) {
  await Payments.createIndex(
    { cashfreeSubscriptionId: 1, kind: 1 },
    { unique: true, partialFilterExpression: { kind: 'auth' } }
  );
  console.log('   ✓ unique partial index on (cashfreeSubscriptionId, kind:"auth")');
} else {
  console.log('   would create unique partial index on (cashfreeSubscriptionId, kind:"auth")');
}

// ── report: pre-existing duplicates (NOT touched) ─────────────────────────
const seen = new Map();
for (const p of all) {
  if (!p.cfPaymentId) continue;
  if (!seen.has(p.cfPaymentId)) seen.set(p.cfPaymentId, []);
  seen.get(p.cfPaymentId).push(p);
}
const dupes = [...seen.entries()].filter(([, rows]) => rows.length > 1);
if (dupes.length) {
  const extra = dupes.reduce((n, [, rows]) => n + rows.length - 1, 0);
  const money = dupes
    .flatMap(([, rows]) => rows.slice(1))
    .filter((p) => p.status === 'success')
    .reduce((n, p) => n + p.amount, 0);
  console.log(`\n⚠  NOT TOUCHED: ${extra} duplicate row(s) across ${dupes.length} cfPaymentId(s) — ₹${money} double-counted in Finance.`);
  for (const [id, rows] of dupes) {
    console.log(`     cfPaymentId ${id}: ${rows.length}× ₹${rows[0].amount} (${rows[0].status})`);
  }
  console.log('   These need a separate, explicitly-approved cleanup.');
}

console.log(`\n${APPLY ? 'Applied' : 'Dry run complete'}: ${created} payment(s) ${APPLY ? 'created' : 'would be created'}, ${skipped} skipped.`);
await mongoose.disconnect();
