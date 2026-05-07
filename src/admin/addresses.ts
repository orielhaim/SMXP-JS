// ─────────────────────────────────────────────────────────────────────────────
// SMXP SDK — Admin Addresses Module
// ─────────────────────────────────────────────────────────────────────────────

import type { KyInstance } from "ky";
import type {
  AdminAddress,
  CreateAddressOptions,
  CreateAddressResponse,
} from "../core/types.js";

export interface AdminAddressesModule {
  list(options?: { domain?: string }): Promise<AdminAddress[]>;
  get(domain: string, alias: string): Promise<AdminAddress>;
  create(options: CreateAddressOptions): Promise<CreateAddressResponse>;
  delete(domain: string, alias: string): Promise<void>;
}

export function createAdminAddressesModule(
  http: KyInstance,
): AdminAddressesModule {
  return {
    async list(options?: { domain?: string }): Promise<AdminAddress[]> {
      const searchParams: Record<string, string> = {};
      if (options?.domain) {
        searchParams["domain"] = options.domain;
      }
      const response: { addresses: AdminAddress[] } = await http
        .get(".smxp/admin/addresses", { searchParams })
        .json();
      return response.addresses;
    },

    async get(domain: string, alias: string): Promise<AdminAddress> {
      const response: { address: AdminAddress } = await http
        .get(`.smxp/admin/addresses/${domain}/${alias}`)
        .json();
      return response.address;
    },

    async create(
      options: CreateAddressOptions,
    ): Promise<CreateAddressResponse> {
      const body: Record<string, unknown> = {
        domain: options.domain,
        alias: options.alias,
        mode: options.mode ?? "inbox",
      };

      if (options.mode === "forward") {
        body["forward_to"] = options.forwardTo;
      } else {
        body["password"] = (options as { password: string }).password;
      }

      const response: CreateAddressResponse = await http
        .post(".smxp/admin/addresses", { json: body })
        .json();
      return response;
    },

    async delete(domain: string, alias: string): Promise<void> {
      await http.delete(`.smxp/admin/addresses/${domain}/${alias}`);
    },
  };
}
