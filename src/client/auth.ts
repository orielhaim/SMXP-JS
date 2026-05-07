// ─────────────────────────────────────────────────────────────────────────────
// SMXP SDK — Auth Module
// ─────────────────────────────────────────────────────────────────────────────

import type { KyInstance } from "ky";
import type { AuthManager } from "../core/auth.js";
import type {
  ApiKey,
  CreateApiKeyOptions,
  CreateApiKeyResponse,
  Credentials,
  LoginResponse,
} from "../core/types.js";

export interface AuthApiKeys {
  list(): Promise<ApiKey[]>;
  create(options?: CreateApiKeyOptions): Promise<CreateApiKeyResponse>;
  delete(id: string): Promise<void>;
}

export interface AuthModule {
  login(credentials: Credentials): Promise<LoginResponse>;
  logout(): Promise<void>;
  getToken(): Promise<string | null>;
  setToken(token: string, expiresAt?: number): Promise<void>;
  apiKeys: AuthApiKeys;
}

export function createAuthModule(
  http: KyInstance,
  authManager: AuthManager,
): AuthModule {
  const apiKeys: AuthApiKeys = {
    async list(): Promise<ApiKey[]> {
      const response: { apikeys: ApiKey[] } = await http
        .get(".smxp/auth/apikeys")
        .json();
      return response.apikeys;
    },

    async create(options?: CreateApiKeyOptions): Promise<CreateApiKeyResponse> {
      const response: CreateApiKeyResponse = await http
        .post(".smxp/auth/apikeys", {
          json: {
            name: options?.name,
            expires_at: options?.expiresAt,
          },
        })
        .json();
      return response;
    },

    async delete(id: string): Promise<void> {
      await http.delete(`.smxp/auth/apikeys/${id}`);
    },
  };

  return {
    async login(credentials: Credentials): Promise<LoginResponse> {
      const response: LoginResponse = await http
        .post(".smxp/auth/login", {
          json: {
            alias: credentials.alias,
            domain: credentials.domain,
            password: credentials.password,
          },
        })
        .json();

      await authManager.setToken(response.token, response.expires_at);
      return response;
    },

    async logout(): Promise<void> {
      try {
        await http.post(".smxp/auth/logout");
      } finally {
        await authManager.removeToken();
      }
    },

    async getToken(): Promise<string | null> {
      return authManager.getToken();
    },

    async setToken(token: string, expiresAt?: number): Promise<void> {
      await authManager.setToken(token, expiresAt);
    },

    apiKeys,
  };
}

export function createRawLoginFn(
  http: KyInstance,
): (credentials: Credentials) => Promise<LoginResponse> {
  return async (credentials: Credentials): Promise<LoginResponse> => {
    const response: LoginResponse = await http
      .post(".smxp/auth/login", {
        json: {
          alias: credentials.alias,
          domain: credentials.domain,
          password: credentials.password,
        },
      })
      .json();
    return response;
  };
}
