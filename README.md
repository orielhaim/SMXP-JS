# @smxp/sdk

JavaScript/TypeScript SDK for [SMXP](https://github.com/orielhaim/SMXP).

Send messages, read inboxes, manage accounts and delegations, stream real-time events - all over HTTP, all typed.

## Install

```bash
bun add @smxp/sdk
# or
npm install @smxp/sdk
```

## Quick start

```ts
import { createSMXP } from "@smxp/sdk"

const smxp = createSMXP({
  baseUrl: "https://mail.example.com",
  credentials: { alias: "alice", domain: "example.com", password: "secret" },
  tokenStorage: "localStorage",
})

// Send a message
await smxp.mail.send({
  to: "bob@other.com",
  subject: "Hey",
  body: "What's up?",
})

// Read inbox
const { messages } = await smxp.mail.inbox()
```

## Entry points

| Import | Purpose |
|--------|---------|
| `@smxp/sdk` | Client - auth, mail, account, delegations |
| `@smxp/sdk/admin` | Server administration - domains, addresses |
| `@smxp/sdk/stream` | Real-time SSE stream |

## Auth

The SDK handles auth automatically. You can either pass a static token or credentials for auto-login:

```ts
// Static token (API key or existing session)
const smxp = createSMXP({ baseUrl: "...", token: "sk_..." })

// Auto-login (SDK logs in, persists token, refreshes automatically)
const smxp = createSMXP({
  baseUrl: "...",
  credentials: { alias: "alice", domain: "example.com", password: "..." },
  tokenStorage: "localStorage", // or "sessionStorage", "memory", "custom"
  autoRefresh: true,
  autoRelogin: true,
})
```

When the server returns `X-SMXP-Token-Refresh`, the SDK picks it up and swaps the token transparently. If a request gets a 401, the SDK re-logs in using the provided credentials - no manual intervention needed.

## Real-time

```ts
import { createSMXPStream } from "@smxp/sdk/stream"

const stream = createSMXPStream({
  baseUrl: "https://mail.example.com",
  token: "...",
})

stream.on("message", ({ message }) => console.log(message.subject))
stream.on("statusChange", (status) => console.log(status))
stream.connect()
```

Auto-reconnects with exponential backoff. Resumes from last event ID - no missed messages.

## Admin

```ts
import { createSMXPAdmin } from "@smxp/sdk/admin"

const admin = createSMXPAdmin({
  baseUrl: "https://mail.example.com",
  adminSecret: "your-secret",
})

await admin.domains.add("newdomain.com")
await admin.addresses.create({ domain: "newdomain.com", alias: "alice", password: "..." })
```

## Full docs

See [docs.md](./docs.md) for complete API reference.

## License

[Apache 2.0](LICENSE)
