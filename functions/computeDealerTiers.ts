
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Simple in-memory cooldown (best-effort). Helps avoid rapid consecutive calls.
const COOLDOWN_MS = 30_000;
if (!globalThis.__dealerTiersLastRun) {
  globalThis.__dealerTiersLastRun = 0;
}

const TIERS = [
  { key: 'tier1', name: 'Базовый', min: 0, max: 500000 },
  { key: 'tier2', name: 'Серебряный', min: 500000, max: 1000000 },
  { key: 'tier3', name: 'Золотой', min: 1000000, max: 3000000 },
  { key: 'tier4', name: 'Платиновый', min: 3000000, max: Infinity }
];

function pickTierByTurnover(amount) {
  if (amount >= 3000000) return 'tier4';
  if (amount >= 1000000) return 'tier3';
  if (amount >= 500000) return 'tier2';
  return 'tier1';
}

function monthRange(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0..11
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { start, end, key: `${y}-${String(m + 1).padStart(2,'0')}` };
}

function previousMonthRange(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end, key: `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}` };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Cooldown gate (429)
  const nowTs = Date.now();
  const last = globalThis.__dealerTiersLastRun || 0;
  const remaining = COOLDOWN_MS - (nowTs - last);
  if (remaining > 0) {
    return new Response(JSON.stringify({ error: `Слишком часто. Повторите через ${Math.ceil(remaining / 1000)} сек.` }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(remaining / 1000))
      }
    });
  }

  if (!(await base44.auth.isAuthenticated())) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const me = await base44.auth.me();
    const isAdmin = me?.role === 'admin';
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const now = new Date();
    const cur = monthRange(now);
    const prev = previousMonthRange(now);

    // Update last run only when we start processing
    globalThis.__dealerTiersLastRun = Date.now();

    // Load all dealers (users with user_type == 'dealer')
    const users = await base44.asServiceRole.entities.User.filter({ user_type: 'dealer' });

    // Helper to sum orders per user and period (using created_date)
    async function sumOrdersFor(email, start, end) {
      const all = await base44.asServiceRole.entities.Order.filter({ created_by: email }, '-created_date', 5000);
      const inRange = all.filter(o => {
        const d = new Date(o.created_date);
        return d >= start && d <= end;
      });
      const sum = inRange.reduce((acc, o) => acc + (o.total_cost || 0), 0);
      return { sum, count: inRange.length };
    }

    let updated = 0;
    for (const u of users) {
      // DEDUPE: выбираем один профиль на user_id (самый свежий по updated_date/created_date)
      const found = await base44.asServiceRole.entities.DealerProfile.filter({ user_id: u.id });
      let profile = null;
      if (!found || found.length === 0) {
        profile = await base44.asServiceRole.entities.DealerProfile.create({
          user_id: u.id,
          company_name: u.retail_point || u.full_name || u.email,
          region: u.city || null,
          points_balance: 0,
          auto_tier: 'tier1',
          current_tier: 'tier1',
          monthly_turnover: 0,
          last_month_turnover: 0,
          orders_count_month: 0,
          updated_month: cur.key
        });
      } else {
        profile = found.sort((a, b) => {
          const ad = new Date(a.updated_date || a.created_date || 0).getTime();
          const bd = new Date(b.updated_date || b.created_date || 0).getTime();
          return bd - ad;
        })[0];
      }

      // Calculate last month (for auto tier) and current month (for progress)
      const { sum: lastSum } = await sumOrdersFor(u.email, prev.start, prev.end);
      const { sum: curSum, count: curCount } = await sumOrdersFor(u.email, cur.start, cur.end);

      const autoTier = pickTierByTurnover(lastSum);

      // Determine current tier (respect manual if enabled and not expired)
      let currentTier = autoTier;
      if (profile.manual_tier_enabled && profile.manual_tier) {
        const valid = profile.manual_tier_expires_at ? (new Date(profile.manual_tier_expires_at) > now) : true;
        if (valid) currentTier = profile.manual_tier;
      }

      await base44.asServiceRole.entities.DealerProfile.update(profile.id, {
        last_month_turnover: Math.round(lastSum),
        monthly_turnover: Math.round(curSum),
        orders_count_month: curCount,
        auto_tier: autoTier,
        current_tier: currentTier,
        updated_month: cur.key,
        last_recalculated_at: now.toISOString()
      });

      updated += 1;
    }

    return new Response(JSON.stringify({ success: true, updated }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    // Reset cooldown if something fails quickly (< 1s) to avoid long lock
    if (Date.now() - nowTs < 1000) {
      globalThis.__dealerTiersLastRun = 0;
    }
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
