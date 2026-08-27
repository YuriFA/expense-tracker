import { createTestDatabase } from '@expense-tracker/local-data/testing'
import {
  rebaseLocalDataForHousehold, createSyncEngine, createApiTransport,
  createLocalAccountRepository, syncOutbox,
} from '@expense-tracker/local-data'
import { createApiClient } from '@expense-tracker/api'

const base = 'http://localhost:8080'
const mk = async (email) => {
  const res = await fetch(base + '/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'strong-password' }),
  })
  const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  const client = createApiClient({ baseUrl: base, fetch: (u, i) => fetch(u, { ...i, headers: { ...(i.headers||{}), cookie } }) })
  return { client, cookie }
}
const owner = await mk('dbg3-owner-' + Date.now() + '@example.com')
const joiner = await mk('dbg3-joiner-' + Date.now() + '@example.com')

// Owner: push one account
{
  const db = await createTestDatabase()
  const engine = createSyncEngine({ db, transport: createApiTransport(owner.client) })
  const repo = createLocalAccountRepository(db)
  await repo.create({ name: 'Owner account', currency: 'USD', openingBalance: 100 })
  const out = await engine.run()
  console.log('owner run:', out)
}
// Joiner: create local account, sync to personal household
const jdb = await createTestDatabase()
const jengine = createSyncEngine({ db: jdb, transport: createApiTransport(joiner.client) })
const jrepo = createLocalAccountRepository(jdb)
await jrepo.create({ name: 'Joiner account', currency: 'USD', openingBalance: 200 })
console.log('joiner run 1:', await jengine.run())

// Owner generates a code; joiner joins
const codeResp = await owner.client.POST('/api/household/code', { params: {} })
const code = codeResp.data.code
const joinResp = await joiner.client.POST('/api/household/join', { body: { code } })
console.log('join status:', joinResp.error ? joinResp.error : 'ok')

// Rebase (carry) and run as the new household
rebaseLocalDataForHousehold(jdb, joinResp.data.id)
const out2 = await jengine.run()
console.log('joiner run 2:', out2)
const ops = jdb.select().from(syncOutbox).all()
console.log('outbox after run:', ops.map(o => ({ op: o.op, entity: o.entityId, attempts: o.attempts, lastError: o.lastError })))
