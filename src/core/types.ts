// ─────────────────────────────────────────────────────────────────────────────
// SMXP SDK — Core Types
// All types use explicit annotations for isolatedDeclarations compliance.
// ─────────────────────────────────────────────────────────────────────────────

/** Message types supported by the SMXP protocol */
export type MessageType = "message" | "edit" | "delete" | "receipt";

/** Content types for message body rendering */
export type ContentType = "text" | "markdown" | "html";

/** Address mode */
export type AddressMode = "inbox" | "forward";

/** Delegation scope */
export type DelegationScope = "send" | "read" | "manage";

// ─── Messages ────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  from: string;
  to: string;
  sender: string;
  recipient: string;
  delivered_to: string;
  subject: string | null;
  body: string | null;
  type: MessageType;
  content_type: ContentType;
  conversation_id: string;
  in_reply_to: string | null;
  on_behalf_of: string | null;
  direction: "in" | "out";
  verified: number;
  created_at: number;
  expires: number | null;
  name: string | null;
  signature: string;
  key_id: string;
  version: string;
}

export interface SendMessageOptions {
  to: string | string[];
  subject?: string;
  body?: string;
  type?: MessageType;
  conversationId?: string;
  inReplyTo?: string;
  contentType?: ContentType;
  onBehalfOf?: string;
}

export interface EditMessageOptions {
  to: string | string[];
  subject?: string;
  body?: string;
  contentType?: ContentType;
  onBehalfOf?: string;
}

export interface SendResultItem {
  status: string;
  to: string;
  id: string | null;
  conversation_id: string;
}

export interface SendResult {
  status: "sent";
  results: SendResultItem[];
}

export interface EditResultItem {
  status: string;
  to: string;
  id: string | null;
  original_id: string;
}

export interface EditResult {
  status: "edited";
  results: EditResultItem[];
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface Cursors {
  after: string | null;
  before: string | null;
}

export interface PaginatedMessages {
  messages: Message[];
  cursors: Cursors;
}

export interface PaginationOptions {
  limit?: number;
  after?: string;
  before?: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  token_id: string;
  expires_at: number;
}

export interface ApiKey {
  id: string;
  name: string | null;
  expires_at: number | null;
  created_at: number;
  last_used: number | null;
}

export interface CreateApiKeyOptions {
  name?: string;
  expiresAt?: number | null;
}

export interface CreateApiKeyResponse {
  token: string;
  id: string;
  name: string | null;
  expires_at: number | null;
}

// ─── Account ─────────────────────────────────────────────────────────────────

export interface AccountInfo {
  alias: string;
  domain: string;
  address: string;
  mode: AddressMode;
  public_key: string;
  key_id: string;
  algorithm: string;
  created_at: number;
}

export interface Session {
  id: string;
  alias: string;
  domain: string;
  type: string;
  created_at: number;
  expires_at: number | null;
  last_used: number | null;
  current: boolean;
}

export interface ChangePasswordOptions {
  currentPassword: string;
  newPassword: string;
}

// ─── Delegations ─────────────────────────────────────────────────────────────

export interface Delegation {
  id: string;
  domain: string;
  alias: string;
  delegate: string;
  scope: DelegationScope;
  expires_at: number | null;
  created_at: number;
}

export interface GrantDelegationOptions {
  delegate: string;
  scope?: DelegationScope;
  expiresAt?: number | null;
}

// ─── Admin Types ─────────────────────────────────────────────────────────────

export interface DnsRecord {
  name: string;
  type: string;
  value: string;
  fingerprint?: string;
}

export interface DomainDns {
  key: DnsRecord;
  service: DnsRecord;
}

export interface DomainInfo {
  domain: string;
  created_at: number;
  dns: DomainDns;
}

export interface DomainVerification {
  domain: string;
  verified: boolean;
  expected_fingerprint: string;
  actual_fingerprint: string | null;
  service: Record<string, unknown>;
}

export interface AdminAddress {
  alias: string;
  domain: string;
  mode: AddressMode;
  public_key?: string;
  key_id?: string;
  algorithm?: string;
  forward_to?: string[];
  created_at: number;
}

export interface CreateInboxAddressOptions {
  domain: string;
  alias: string;
  password: string;
  mode?: "inbox";
}

export interface CreateForwardAddressOptions {
  domain: string;
  alias: string;
  mode: "forward";
  forwardTo: string | string[];
}

export type CreateAddressOptions =
  | CreateInboxAddressOptions
  | CreateForwardAddressOptions;

export interface CreateAddressResponse {
  address: string;
  domain: string;
  alias: string;
  mode: AddressMode;
  public_key?: string;
  key_id?: string;
  algorithm?: string;
  forward_to?: string[];
}

// ─── Configuration ───────────────────────────────────────────────────────────

export type TokenStorage =
  | "memory"
  | "localStorage"
  | "sessionStorage"
  | "custom";

export interface CustomTokenStorage {
  get(): string | null | Promise<string | null>;
  set(token: string, expiresAt?: number): void | Promise<void>;
  remove(): void | Promise<void>;
}

export interface Credentials {
  alias: string;
  domain: string;
  password: string;
}

export interface SMXPClientConfig {
  /** Base URL of the SMXP server (e.g. "https://mail.example.com") */
  baseUrl: string;

  /** Static token (session token or API key) — mutually exclusive with `credentials` */
  token?: string;

  /** Auto-login credentials — the SDK will handle login/refresh automatically */
  credentials?: Credentials;

  /**
   * Where to persist the session token.
   * - "memory" (default) — in-memory only, lost on page reload
   * - "localStorage" — persists across tabs and reloads (browser only)
   * - "sessionStorage" — persists within the tab (browser only)
   * - "custom" — provide your own storage via `customStorage`
   */
  tokenStorage?: TokenStorage;

  /** Custom storage implementation when tokenStorage is "custom" */
  customStorage?: CustomTokenStorage;

  /**
   * Whether to automatically refresh the session when the server
   * sends X-SMXP-Token-Refresh header. Default: true
   */
  autoRefresh?: boolean;

  /**
   * Whether to automatically re-login when receiving a 401 response.
   * Only works when `credentials` are provided. Default: true
   */
  autoRelogin?: boolean;

  /**
   * Maximum number of auto-relogin attempts before giving up. Default: 3
   */
  maxReloginAttempts?: number;

  /**
   * Called whenever the token is refreshed or renewed.
   * Useful for syncing token state externally.
   */
  onTokenRefresh?: (token: string, expiresAt?: number) => void;

  /**
   * Called when authentication fails permanently (after retries exhausted).
   */
  onAuthFailure?: (error: Error) => void;

  /**
   * Custom headers to include in every request.
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds. Default: 30000 (30s)
   */
  timeout?: number;

  /**
   * Number of retry attempts for failed requests (network errors, 5xx).
   * Default: 2
   */
  retries?: number;

  /**
   * Custom ky options that will be merged with the SDK's defaults.
   * Advanced usage — use with care.
   */
  kyOptions?: Record<string, unknown>;
}

export interface SMXPAdminConfig {
  /** Base URL of the SMXP server */
  baseUrl: string;

  /** Admin secret / API key for the admin endpoints */
  adminSecret: string;

  /** Custom headers to include in every request */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds. Default: 30000 */
  timeout?: number;

  /** Number of retry attempts. Default: 2 */
  retries?: number;

  /** Custom ky options */
  kyOptions?: Record<string, unknown>;
}
