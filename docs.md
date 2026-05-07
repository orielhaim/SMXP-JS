# @smxp/sdk - Documentation

Complete API reference for the SMXP JavaScript SDK.

---

## Table of contents

- [createSMXP](#createsmxp)
- [Auth](#auth)
- [Mail](#mail)
- [Account](#account)
- [Delegations](#delegations)
- [Stream](#stream)
- [Admin](#admin)
- [Errors](#errors)
- [Utilities](#utilities)

---

## createSMXP

```ts
import { createSMXP } from "@smxp/sdk"

const smxp = createSMXP(config)
```

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | - | Server URL. Required. |
| `token` | `string` | - | Static session token or API key. |
| `credentials` | `{ alias, domain, password }` | - | Auto-login credentials. |
| `tokenStorage` | `"memory" \| "localStorage" \| "sessionStorage" \| "custom"` | `"memory"` | Where to persist the token. |
| `customStorage` | `CustomTokenStorage` | - | Your own get/set/remove implementation. Required when tokenStorage is "custom". |
| `autoRefresh` | `boolean` | `true` | Auto-swap token when server sends X-SMXP-Token-Refresh. |
| `autoRelogin` | `boolean` | `true` | Auto re-login on 401. Only works with credentials. |
| `maxReloginAttempts` | `number` | `3` | Give up after this many failed re-login attempts. |
| `onTokenRefresh` | `(token, expiresAt?) => void` | - | Called when token changes. |
| `onAuthFailure` | `(error) => void` | - | Called when auth fails permanently. |
| `headers` | `Record<string, string>` | - | Extra headers on every request. |
| `timeout` | `number` | `30000` | Request timeout (ms). |
| `retries` | `number` | `2` | Retry count for 5xx / network errors. |
| `kyOptions` | `object` | - | Raw ky options (advanced). |

You can pass `token` OR `credentials`, not both.

### Custom token storage

```ts
const smxp = createSMXP({
  baseUrl: "...",
  credentials: { ... },
  tokenStorage: "custom",
  customStorage: {
    async get() { return await myStore.get("token") },
    async set(token, expiresAt) { await myStore.set("token", token) },
    async remove() { await myStore.delete("token") },
  },
})
```

---

## Auth

```ts
smxp.auth.login(credentials)
smxp.auth.logout()
smxp.auth.getToken()
smxp.auth.setToken(token, expiresAt?)
smxp.auth.apiKeys.list()
smxp.auth.apiKeys.create(options?)
smxp.auth.apiKeys.delete(id)
```

### login

```ts
const { token, token_id, expires_at } = await smxp.auth.login({
  alias: "alice",
  domain: "example.com",
  password: "secret",
})
```

Stores the token automatically. You don't need to call this manually if you passed `credentials` to `createSMXP`.

### logout

```ts
await smxp.auth.logout()
```

Revokes the session server-side and clears local storage.

### apiKeys.create

```ts
const { token, id } = await smxp.auth.apiKeys.create({
  name: "my-bot",
  expiresAt: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
})
```

### apiKeys.list

```ts
const keys = await smxp.auth.apiKeys.list()
// [{ id, name, expires_at, created_at, last_used }]
```

### apiKeys.delete

```ts
await smxp.auth.apiKeys.delete("key-id")
```

---

## Mail

```ts
smxp.mail.inbox(options?)
smxp.mail.sent(options?)
smxp.mail.get(id)
smxp.mail.thread(id)
smxp.mail.send(options)
smxp.mail.markRead(id)
smxp.mail.edit(id, options)
```

### inbox / sent

```ts
const { messages, cursors } = await smxp.mail.inbox({ limit: 20 })

// Paginate
const nextPage = await smxp.mail.inbox({ limit: 20, after: cursors.after })
const prevPage = await smxp.mail.inbox({ limit: 20, before: cursors.before })
```

Pagination options:

| Option | Type | Description |
|--------|------|-------------|
| `limit` | `number` | 1-100, default 20 |
| `after` | `string` | Cursor for next page |
| `before` | `string` | Cursor for previous page |

### get

```ts
const message = await smxp.mail.get("message-id")
```

Returns a single `Message` object.

### thread

```ts
const messages = await smxp.mail.thread("any-message-id-in-the-thread")
```

Returns all messages in the conversation, ordered by time.

### send

```ts
await smxp.mail.send({
  to: "bob@example.com",
  subject: "Hello",
  body: "This is **markdown**",
  contentType: "markdown",
})

// Multiple recipients
await smxp.mail.send({
  to: ["alice@a.com", "bob@b.com"],
  body: "Group message",
})

// Reply to a message
await smxp.mail.send({
  to: "bob@example.com",
  body: "Got it, thanks",
  conversationId: "existing-conversation-id",
  inReplyTo: "message-id-being-replied-to",
})

// Send on behalf of another address (requires delegation)
await smxp.mail.send({
  to: "charlie@c.com",
  body: "Sent by bot on behalf of alice",
  onBehalfOf: "alice@example.com",
})
```

Send options:

| Option | Type | Description |
|--------|------|-------------|
| `to` | `string \| string[]` | Recipient(s). Required. |
| `subject` | `string` | Message subject. |
| `body` | `string` | Message body. |
| `type` | `"message" \| "edit" \| "delete" \| "receipt"` | Default: `"message"`. |
| `contentType` | `"text" \| "markdown" \| "html"` | Default: `"text"`. |
| `conversationId` | `string` | Existing conversation ID (auto-generated if omitted). |
| `inReplyTo` | `string` | ID of message being replied to. |
| `onBehalfOf` | `string` | Send as another address (needs delegation). |

### markRead

```ts
await smxp.mail.markRead("message-id")
```

### edit

```ts
await smxp.mail.edit("original-message-id", {
  to: "bob@example.com",
  body: "Corrected text",
  contentType: "text",
})
```

---

## Account

```ts
smxp.account.info()
smxp.account.changePassword(options)
smxp.account.sessions.list()
smxp.account.sessions.revoke(id)
```

### info

```ts
const info = await smxp.account.info()
// { alias, domain, address, mode, public_key, key_id, algorithm, created_at }
```

### changePassword

```ts
await smxp.account.changePassword({
  currentPassword: "old",
  newPassword: "new-at-least-8-chars",
})
```

### sessions.list

```ts
const sessions = await smxp.account.sessions.list()
// [{ id, created_at, expires_at, last_used, current }]
```

### sessions.revoke

```ts
await smxp.account.sessions.revoke("session-id")
```

Cannot revoke the current session - use `smxp.auth.logout()` for that.

---

## Delegations

```ts
smxp.delegations.list()
smxp.delegations.granted()
smxp.delegations.grant(options)
smxp.delegations.revoke(id)
```

### grant

```ts
const delegation = await smxp.delegations.grant({
  delegate: "bot@automation.io",
  scope: "send",                    // "send" | "read" | "manage"
  expiresAt: Date.now() / 1000 + 86400, // optional, unix timestamp
})
```

### list

```ts
const delegations = await smxp.delegations.list()
```

Returns delegations you've granted to others.

### granted

```ts
const delegations = await smxp.delegations.granted()
```

Returns delegations others have granted to you.

### revoke

```ts
await smxp.delegations.revoke("delegation-id")
```

---

## Stream

```ts
import { createSMXPStream } from "@smxp/sdk/stream"
```

### createSMXPStream

```ts
const stream = createSMXPStream(config)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | - | Server URL. Required. |
| `token` | `string` | - | Auth token. Required. |
| `lastEventId` | `string` | - | Resume from this ID (server replays missed messages). |
| `autoReconnect` | `boolean` | `true` | Reconnect on disconnect. |
| `reconnectDelay` | `number` | `1000` | Initial delay (ms). |
| `maxReconnectDelay` | `number` | `30000` | Max delay after backoff (ms). |
| `backoffMultiplier` | `number` | `2` | Exponential backoff factor. |
| `maxReconnectAttempts` | `number` | `Infinity` | Give up after N attempts. |
| `onTokenRefresh` | `() => string \| Promise<string>` | - | Get fresh token on reconnect. |
| `headers` | `Record<string, string>` | - | Extra headers. |
| `fetch` | `typeof fetch` | - | Custom fetch implementation. |

### Events

```ts
stream.on("message", ({ type, message }) => { })
stream.on("edit", ({ type, message }) => { })
stream.on("delete", ({ type, message }) => { })
stream.on("receipt", ({ type, message }) => { })
stream.on("event", ({ type, message }) => { })  // catch-all
stream.on("error", (error) => { })
stream.on("statusChange", (status) => { })       // "connecting" | "connected" | "disconnected"
```

### Methods

```ts
stream.connect()
stream.disconnect()
stream.removeAllListeners()
stream.status      // current status
stream.lastEventId // last received event ID
```

### Token refresh for long-lived streams

```ts
const stream = createSMXPStream({
  baseUrl: "...",
  token: currentToken,
  onTokenRefresh: async () => {
    // Called before each reconnection attempt
    const newToken = await smxp.auth.getToken()
    return newToken!
  },
})
```

---

## Admin

```ts
import { createSMXPAdmin } from "@smxp/sdk/admin"

const admin = createSMXPAdmin({
  baseUrl: "https://mail.example.com",
  adminSecret: "your-admin-secret",
  timeout: 30000,
  retries: 2,
})
```

### Domains

```ts
admin.domains.list()
admin.domains.get(domain)
admin.domains.add(domain)
admin.domains.verify(domain)
admin.domains.delete(domain)
```

```ts
// Add and verify
await admin.domains.add("example.com")
const verification = await admin.domains.verify("example.com")
// { domain, verified, expected_fingerprint, actual_fingerprint, service }
```

### Addresses

```ts
admin.addresses.list(options?)
admin.addresses.get(domain, alias)
admin.addresses.create(options)
admin.addresses.delete(domain, alias)
```

```ts
// Create inbox
await admin.addresses.create({
  domain: "example.com",
  alias: "alice",
  password: "secure-password",
})

// Create forward
await admin.addresses.create({
  domain: "example.com",
  alias: "support",
  mode: "forward",
  forwardTo: ["alice@example.com", "bob@example.com"],
})

// List addresses for a domain
const addresses = await admin.addresses.list({ domain: "example.com" })

// Delete
await admin.addresses.delete("example.com", "alice")
```

---

## Errors

All SDK methods throw typed errors on failure:

| Class | HTTP Status | When |
|-------|-------------|------|
| `SMXPValidationError` | 400 | Invalid input |
| `SMXPAuthError` | 401 | Not authenticated |
| `SMXPForbiddenError` | 403 | Not authorized |
| `SMXPNotFoundError` | 404 | Resource not found |
| `SMXPConflictError` | 409 | Already exists |
| `SMXPError` | other | Any other server error |
| `SMXPNetworkError` | - | Network failure / timeout |
| `SMXPConfigError` | - | Invalid SDK configuration |

Every error has:

```ts
error.status   // HTTP status code
error.code     // Error string from server
error.message  // Human-readable message
error.body     // Full response body
```

---

## Utilities

```ts
import { parseAddress, formatAddress, isValidAddress } from "@smxp/sdk"
```

### parseAddress

```ts
const { localPart, domain, address } = parseAddress("alice@example.com")
// { localPart: "alice", domain: "example.com", address: "alice@example.com" }
```

Throws on invalid input.

### formatAddress

```ts
formatAddress("Alice", "Example.COM") // "alice@example.com"
```

### isValidAddress

```ts
isValidAddress("alice@example.com") // true
isValidAddress("not-an-address")    // false
```

---

## Message object

Every message returned from the API has this shape:

```ts
{
  id: string
  from: string
  to: string
  sender: string
  recipient: string
  delivered_to: string
  subject: string | null
  body: string | null
  type: "message" | "edit" | "delete" | "receipt"
  content_type: "text" | "markdown" | "html"
  conversation_id: string
  in_reply_to: string | null
  on_behalf_of: string | null
  direction: "in" | "out"
  verified: number
  created_at: number         // unix timestamp
  expires: number | null     // unix timestamp
  name: string | null
  signature: string
  key_id: string
  version: string            // "SMXP/1.0"
}
```

---

## Environment support

Works in any environment with `fetch`, `ReadableStream`, and `TextDecoder`:

- Bun >= 1.2
- Node.js >= 18
- Deno >= 1.30
- All modern browsers
- Cloudflare Workers
- Vercel Edge Functions
