// ─────────────────────────────────────────────────────────────────────────────
// SMXP SDK — Admin Domains Module
// ─────────────────────────────────────────────────────────────────────────────

import type { KyInstance } from "ky";
import type { DomainInfo, DomainVerification } from "../core/types.js";

export interface AdminDomainsModule {
  list(): Promise<DomainInfo[]>;
  get(domain: string): Promise<DomainInfo>;
  add(domain: string): Promise<DomainInfo>;
  verify(domain: string): Promise<DomainVerification>;
  delete(domain: string): Promise<void>;
}

export function createAdminDomainsModule(http: KyInstance): AdminDomainsModule {
  return {
    async list(): Promise<DomainInfo[]> {
      const response: { domains: DomainInfo[] } = await http
        .get(".smxp/admin/domains")
        .json();
      return response.domains;
    },

    async get(domain: string): Promise<DomainInfo> {
      const response: DomainInfo = await http
        .get(`.smxp/admin/domains/${domain}`)
        .json();
      return response;
    },

    async add(domain: string): Promise<DomainInfo> {
      const response: DomainInfo = await http
        .post(".smxp/admin/domains", { json: { domain } })
        .json();
      return response;
    },

    async verify(domain: string): Promise<DomainVerification> {
      const response: DomainVerification = await http
        .post(`.smxp/admin/domains/${domain}/verify`)
        .json();
      return response;
    },

    async delete(domain: string): Promise<void> {
      await http.delete(`.smxp/admin/domains/${domain}`);
    },
  };
}
