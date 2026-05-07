// ─────────────────────────────────────────────────────────────────────────────
// @smxp/sdk — Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

import { AuthManager } from "./core/auth.js";
import { SMXPConfigError } from "./core/errors.js";
import { createHttpClient } from "./core/http.js";
import { createTokenStorage } from "./core/storage.js";
import type { SMXPClientConfig } from "./core/types.js";
import { createAccountModule } from "./client/account.js";
import type { AccountModule } from "./client/account.js";
import { createAuthModule, createRawLoginFn } from "./client/auth.js";
import type { AuthModule } from "./client/auth.js";
import { createDelegationsModule } from "./client/delegations.js";
import type { DelegationsModule } from "./client/delegations.js";
import { createMailModule } from "./client/mail.js";
import type { MailModule } from "./client/mail.js";
import type { KyInstance } from "ky";

// ─── Client Interface ────────────────────────────────────────────────────────

export interface SMXPClient {
  /** Authentication — login, logout, API keys */
  auth: AuthModule;
  /** Messaging — inbox, sent, send, threads */
  mail: MailModule;
  /** Account management — info, password, sessions */
  account: AccountModule;
  /** Delegations — grant and manage send/read/manage permissions */
  delegations: DelegationsModule;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates an SMXP client instance.
 *
 * @example Basic usage with a token
 * ```ts
 * const smxp = createSMXP({
 *   baseUrl: "https://mail.example.com",
 *   token: "your-session-token",
 * })
 * const inbox = await smxp.mail.inbox()
 * ```
 *
 * @example Auto-login with credentials + browser persistence
 * ```ts
 * const smxp = createSMXP({
 *   baseUrl: "https://mail.example.com",
 *   credentials: { alias: "alice", domain: "example.com", password: "secret" },
 *   tokenStorage: "localStorage",
 * })
 * ```
 */
export function createSMXP(config: SMXPClientConfig): SMXPClient {
  // ─── Validate ────────────────────────────────────────────────────────────
  if (!config.baseUrl) {
    throw new SMXPConfigError("baseUrl is required");
  }
  if (config.token && config.credentials) {
    throw new SMXPConfigError(
      "Provide either 'token' or 'credentials', not both",
    );
  }
  if (config.tokenStorage === "custom" && !config.customStorage) {
    throw new SMXPConfigError(
      "customStorage is required when tokenStorage is 'custom'",
    );
  }

  // ─── Defaults ────────────────────────────────────────────────────────────
  const tokenStorage = config.tokenStorage ?? "memory";
  const autoRefresh = config.autoRefresh ?? true;
  const autoRelogin = config.autoRelogin ?? true;
  const maxReloginAttempts = config.maxReloginAttempts ?? 3;
  const timeout = config.timeout ?? 30_000;
  const retries = config.retries ?? 2;

  // ─── Storage ─────────────────────────────────────────────────────────────
  const storage = createTokenStorage(tokenStorage, config.customStorage);

  if (config.token) {
    storage.set(config.token);
  }

  // ─── Auth Manager ────────────────────────────────────────────────────────
  const authManager = new AuthManager({
    storage,
    credentials: config.credentials,
    autoRefresh,
    autoRelogin,
    maxReloginAttempts,
    onTokenRefresh: config.onTokenRefresh,
    onAuthFailure: config.onAuthFailure,
  });

  // ─── HTTP ────────────────────────────────────────────────────────────────
  const http: KyInstance = createHttpClient({
    baseUrl: config.baseUrl,
    auth: authManager,
    timeout,
    retries,
    headers: config.headers,
    kyOptions: config.kyOptions,
  });

  // ─── Wire login function ─────────────────────────────────────────────────
  authManager.setLoginFn(createRawLoginFn(http));

  // ─── Auto-login if credentials provided ──────────────────────────────────
  if (config.credentials && !config.token) {
    const initPromise: Promise<string | null> = authManager
      .attemptRelogin()
      .catch((): null => null);

    // Wrap http to await initial login before any request
    const readyHttp: KyInstance = new Proxy(http, {
      get(
        target: KyInstance,
        prop: string | symbol,
        receiver: unknown,
      ): unknown {
        const original = Reflect.get(target, prop, receiver);
        if (typeof original === "function") {
          return async (...args: unknown[]): Promise<unknown> => {
            await initPromise;
            return (original as (...a: unknown[]) => unknown).apply(
              target,
              args,
            );
          };
        }
        return original;
      },
    }) as KyInstance;

    return {
      auth: createAuthModule(http, authManager),
      mail: createMailModule(readyHttp),
      account: createAccountModule(readyHttp),
      delegations: createDelegationsModule(readyHttp),
    };
  }

  // ─── Build ───────────────────────────────────────────────────────────────
  return {
    auth: createAuthModule(http, authManager),
    mail: createMailModule(http),
    account: createAccountModule(http),
    delegations: createDelegationsModule(http),
  };
}

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type {
  SMXPClientConfig,
  Message,
  SendMessageOptions,
  EditMessageOptions,
  SendResult,
  SendResultItem,
  EditResult,
  EditResultItem,
  PaginatedMessages,
  PaginationOptions,
  Cursors,
  LoginResponse,
  ApiKey,
  CreateApiKeyOptions,
  CreateApiKeyResponse,
  AccountInfo,
  Session,
  ChangePasswordOptions,
  Delegation,
  GrantDelegationOptions,
  DelegationScope,
  MessageType,
  ContentType,
  AddressMode,
  TokenStorage,
  CustomTokenStorage,
  Credentials,
} from "./core/types.js";

export {
  SMXPError,
  SMXPAuthError,
  SMXPForbiddenError,
  SMXPNotFoundError,
  SMXPConflictError,
  SMXPValidationError,
  SMXPNetworkError,
  SMXPConfigError,
} from "./core/errors.js";

export { parseAddress, formatAddress, isValidAddress } from "./core/utils.js";
export type { ParsedAddress } from "./core/utils.js";

export type { AuthModule, AuthApiKeys } from "./client/auth.js";
export type { MailModule } from "./client/mail.js";
export type { AccountModule, SessionsModule } from "./client/account.js";
export type { DelegationsModule } from "./client/delegations.js";
