// ─────────────────────────────────────────────────────────────────────────────
// SMXP SDK — Delegations Module
// ─────────────────────────────────────────────────────────────────────────────

import type { KyInstance } from "ky";
import type { Delegation, GrantDelegationOptions } from "../core/types.js";

export interface DelegationsModule {
  list(): Promise<Delegation[]>;
  granted(): Promise<Delegation[]>;
  grant(options: GrantDelegationOptions): Promise<Delegation>;
  revoke(id: string): Promise<void>;
}

export function createDelegationsModule(http: KyInstance): DelegationsModule {
  return {
    async list(): Promise<Delegation[]> {
      const response: { delegations: Delegation[] } = await http
        .get(".smxp/delegations/")
        .json();
      return response.delegations;
    },

    async granted(): Promise<Delegation[]> {
      const response: { delegations: Delegation[] } = await http
        .get(".smxp/delegations/granted")
        .json();
      return response.delegations;
    },

    async grant(options: GrantDelegationOptions): Promise<Delegation> {
      const response: { delegation: Delegation } = await http
        .post(".smxp/delegations/", {
          json: {
            delegate: options.delegate,
            scope: options.scope,
            expires_at: options.expiresAt,
          },
        })
        .json();
      return response.delegation;
    },

    async revoke(id: string): Promise<void> {
      await http.delete(`.smxp/delegations/${id}`);
    },
  };
}
