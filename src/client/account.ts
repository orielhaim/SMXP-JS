// ─────────────────────────────────────────────────────────────────────────────
// SMXP SDK — Account Module
// ─────────────────────────────────────────────────────────────────────────────

import type { KyInstance } from "ky";
import type {
  AccountInfo,
  ChangePasswordOptions,
  Session,
} from "../core/types.js";

export interface SessionsModule {
  list(): Promise<Session[]>;
  revoke(id: string): Promise<void>;
}

export interface AccountModule {
  info(): Promise<AccountInfo>;
  changePassword(options: ChangePasswordOptions): Promise<void>;
  sessions: SessionsModule;
}

export function createAccountModule(http: KyInstance): AccountModule {
  const sessions: SessionsModule = {
    async list(): Promise<Session[]> {
      const response: { sessions: Session[] } = await http
        .get(".smxp/account/sessions")
        .json();
      return response.sessions;
    },

    async revoke(id: string): Promise<void> {
      await http.delete(`.smxp/account/sessions/${id}`);
    },
  };

  return {
    async info(): Promise<AccountInfo> {
      const response: AccountInfo = await http.get(".smxp/account/info").json();
      return response;
    },

    async changePassword(options: ChangePasswordOptions): Promise<void> {
      await http.put(".smxp/account/password", {
        json: {
          current_password: options.currentPassword,
          new_password: options.newPassword,
        },
      });
    },

    sessions,
  };
}
