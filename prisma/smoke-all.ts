/**
 * End-to-end API smoke checks for Riviraa roles + Features 1–5.
 * Run: npx tsx prisma/smoke-all.ts
 */
const BASE = process.env.API_BASE || 'http://localhost:3001/api'

type Result = { name: string; ok: boolean; detail?: string }

async function req(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

async function login(email: string, password = 'password123') {
  const { status, json } = await req('POST', '/auth/login', undefined, { email, password })
  if (status >= 400 || !json?.success) throw new Error(`login failed ${email}: ${json?.message || status}`)
  const token = json.data?.token || json.token
  if (!token) throw new Error(`no token for ${email}`)
  return token as string
}

function pass(name: string, detail?: string): Result {
  return { name, ok: true, detail }
}
function fail(name: string, detail?: string): Result {
  return { name, ok: false, detail }
}

async function checkGet(name: string, path: string, token: string): Promise<Result> {
  const { status, json } = await req('GET', path, token)
  if (status >= 400 || json?.success === false) {
    return fail(name, `${status} ${json?.message || ''}`)
  }
  return pass(name)
}

async function main() {
  const results: Result[] = []

  // Health
  {
    const { status, json } = await req('GET', '/health')
    results.push(
      status < 400 && json?.database === 'connected'
        ? pass('health', json.database)
        : fail('health', JSON.stringify(json))
    )
  }

  const tokens: Record<string, string> = {}
  const accounts = [
    ['customer', 'priya.sharma@email.com'],
    ['seller', 'rahul@electronics.in'],
    ['manager', 'anita.verma@marketplace.com'],
    ['admin', 'vikram.singh@marketplace.com'],
    ['superadmin', 'root@marketplace.com'],
    ['delivery', 'arjun.rider@riviraa.com'],
  ] as const

  for (const [role, email] of accounts) {
    try {
      tokens[role] = await login(email)
      results.push(pass(`login:${role}`))
    } catch (e) {
      results.push(fail(`login:${role}`, e instanceof Error ? e.message : String(e)))
    }
  }

  // Customer
  if (tokens.customer) {
    for (const [name, path] of [
      ['customer:products', '/products'],
      ['customer:categories', '/categories'],
      ['customer:cart', '/cart'],
      ['customer:orders', '/orders'],
      ['customer:notifications', '/notifications'],
    ] as const) {
      results.push(await checkGet(name, path, tokens.customer))
    }
  }

  // Seller dashboards + F5
  if (tokens.seller) {
    for (const [name, path] of [
      ['seller:me', '/sellers/me'],
      ['seller:products', '/sellers/me/products'],
      ['seller:orders', '/sellers/me/orders'],
      ['seller:earnings', '/sellers/me/earnings'],
      ['seller:payouts', '/sellers/me/payouts'],
      ['seller:settlements', '/sellers/me/settlements'],
      ['seller:returns', '/sellers/me/returns'],
      ['seller:campaigns', '/sellers/me/campaigns'],
      ['seller:analytics', '/analytics/dashboard'],
    ] as const) {
      results.push(await checkGet(name, path, tokens.seller))
    }

    const ship = await req('PATCH', '/sellers/me/shipping', tokens.seller, {
      freeShippingAbove: 599,
      standardFee: 45,
      expressFee: 120,
      processingDays: 2,
    })
    results.push(
      ship.status < 400 && ship.json?.success
        ? pass('seller:shipping-persist', JSON.stringify(ship.json.data))
        : fail('seller:shipping-persist', ship.json?.message)
    )
    const me = await req('GET', '/sellers/me', tokens.seller)
    const ss = me.json?.data?.shippingSettings
    results.push(
      ss?.freeShippingAbove === 599 ? pass('seller:shipping-sync') : fail('seller:shipping-sync', JSON.stringify(ss))
    )
  }

  // Manager
  if (tokens.manager) {
    for (const [name, path] of [
      ['manager:sellers', '/manager/sellers'],
      ['manager:escalations', '/manager/escalations'],
      ['manager:approvals', '/manager/approvals'],
      ['manager:inventory', '/manager/inventory'],
      ['manager:reports', '/manager/reports'],
      ['manager:delivery-partners', '/manager/delivery-partners'],
      ['manager:analytics', '/analytics/dashboard'],
    ] as const) {
      results.push(await checkGet(name, path, tokens.manager))
    }
  }

  // Admin
  if (tokens.admin) {
    for (const [name, path] of [
      ['admin:users', '/users'],
      ['admin:sellers', '/sellers'],
      ['admin:orders', '/orders'],
      ['admin:products', '/products'],
      ['admin:ads', '/ads'],
      ['admin:analytics', '/analytics/dashboard'],
    ] as const) {
      results.push(await checkGet(name, path, tokens.admin))
    }
  }

  // Superadmin + F4 payout mark
  if (tokens.superadmin) {
    for (const [name, path] of [
      ['sa:config', '/superadmin/config'],
      ['sa:finance-pl', '/superadmin/finance/pl'],
      ['sa:finance-payouts', '/superadmin/finance/payouts'],
      ['sa:team', '/superadmin/team'],
      ['sa:alerts', '/superadmin/alerts'],
      ['sa:audit', '/superadmin/audit-logs'],
      ['sa:analytics', '/analytics/dashboard'],
    ] as const) {
      results.push(await checkGet(name, path, tokens.superadmin))
    }

    const payouts = await req('GET', '/superadmin/finance/payouts', tokens.superadmin)
    const pending = (payouts.json?.data?.payouts || []).find(
      (p: { status: string }) => p.status === 'pending' || p.status === 'processing'
    )
    if (pending) {
      const upd = await req('PATCH', `/superadmin/finance/payouts/${pending.id}`, tokens.superadmin, {
        status: 'paid',
      })
      results.push(
        upd.status < 400 && upd.json?.data?.status === 'paid'
          ? pass('sa:mark-payout-paid', pending.id)
          : fail('sa:mark-payout-paid', upd.json?.message)
      )
    } else {
      results.push(pass('sa:mark-payout-paid', 'no pending payout (skipped)'))
    }
  }

  // Delivery F1
  if (tokens.delivery) {
    for (const [name, path] of [
      ['delivery:me', '/delivery/me'],
      ['delivery:dashboard', '/delivery/me/dashboard'],
      ['delivery:deliveries', '/delivery/me/deliveries'],
      ['delivery:route', '/delivery/me/route'],
      ['delivery:cod', '/delivery/me/cod'],
      ['delivery:earnings', '/delivery/me/earnings'],
    ] as const) {
      results.push(await checkGet(name, path, tokens.delivery))
    }
  }

  // Public products featured
  results.push(await checkGet('public:featured', '/products/featured', tokens.customer || tokens.admin))

  const failed = results.filter((r) => !r.ok)
  console.log('\n=== SMOKE RESULTS ===')
  for (const r of results) {
    console.log(`${r.ok ? 'OK' : 'FAIL'}  ${r.name}${r.detail ? ' — ' + r.detail : ''}`)
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
