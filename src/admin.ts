// ─────────────────────────────────────────────────────────────────────────────
// @smxp/sdk/admin — Admin Client Entry Point
// ─────────────────────────────────────────────────────────────────────────────

import { SMXPConfigError } from "./core/errors.js";
import { createAdminHttpClient } from "./core/http.js";
import type { SMXPAdminConfig } from "./core/types.js";
import { createAdminAddressesModule } from "./admin/addresses.js";
import type { AdminAddressesModule } from "./admin/addresses.js";
import { createAdminDomainsModule } from "./admin/domains.js";
import type { AdminDomainsModule } from "./admin/domains.js";

// ─── Interface ───────────────────────────────────────────────────────────────

export interface SMXPAdmin {
  /** Domain management — list, add, verify, delete */
  domains: AdminDomainsModule;
  /** Address management — list, create, get, delete */
  addresses: AdminAddressesModule;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates an SMXP Admin client instance.
 *
 * @example
 * ```ts
 * import { createSMXPAdmin } from "@smxp/sdk/admin"
 *
 * const admin = createSMXPAdmin({
 *   baseUrl: "https://mail.example.com",
 *   adminSecret: "your-admin-secret",
 * })
 *
 * await admin.domains.add("example.com")
 * await admin.addresses.create({ domain: "example.com", alias: "alice", password: "pass" })
 * ```
 */
export function createSMXPAdmin(config: SMXPAdminConfig): SMXPAdmin {
  if (!config.baseUrl) {
    throw new SMXPConfigError("baseUrl is required");
  }
  if (!config.adminSecret) {
    throw new SMXPConfigError("adminSecret is required");
  }

  const timeout: number = config.timeout ?? 30_000;
  const retries: number = config.retries ?? 2;

  const http = createAdminHttpClient({
    baseUrl: config.baseUrl,
    adminSecret: config.adminSecret,
    timeout,
    retries,
    headers: config.headers,
    kyOptions: config.kyOptions,
  });

  return {
    domains: createAdminDomainsModule(http),
    addresses: createAdminAddressesModule(http),
  };
}

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type {
  SMXPAdminConfig,
  DomainInfo,
  DomainDns,
  DomainVerification,
  AdminAddress,
  CreateAddressOptions,
  CreateInboxAddressOptions,
  CreateForwardAddressOptions,
  CreateAddressResponse,
  DnsRecord,
} from "./core/types.js";

export type { AdminDomainsModule } from "./admin/domains.js";
export type { AdminAddressesModule } from "./admin/addresses.js";

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
