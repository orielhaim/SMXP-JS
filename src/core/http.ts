import ky from "ky";
import type { KyInstance } from "ky";
import type { AuthManager } from "./auth.js";
import { SMXPNetworkError, createSMXPError } from "./errors.js";
import type { SMXPErrorBody } from "./errors.js";

export interface HttpClientConfig {
  baseUrl: string;
  auth: AuthManager;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
  kyOptions?: Record<string, unknown>;
}

export interface AdminHttpClientConfig {
  baseUrl: string;
  adminSecret: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
  kyOptions?: Record<string, unknown>;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function createHttpClient(config: HttpClientConfig): KyInstance {
  const { baseUrl, auth, timeout, retries, headers, kyOptions } = config;

  const instance: KyInstance = ky.create({
    prefix: normalizeBaseUrl(baseUrl),
    timeout,
    retry: {
      limit: retries,
      statusCodes: [408, 429, 500, 502, 503, 504],
      methods: ["get", "post", "put", "delete"],
    },
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    hooks: {
      beforeRequest: [
        async ({ request }) => {
          const token = await auth.getToken();
          if (token) {
            request.headers.set("Authorization", `Bearer ${token}`);
          }
        },
      ],
      afterResponse: [
        async ({ response }) => {
          const refreshedToken = response.headers.get("x-smxp-token-refresh");
          if (refreshedToken) {
            await auth.handleRefresh(refreshedToken);
          }
        },
        async ({ request, options, response }) => {
          if (response.status === 401 && auth.hasCredentials) {
            const newToken = await auth.attemptRelogin();
            if (newToken) {
              request.headers.set("Authorization", `Bearer ${newToken}`);
              return ky(request, options) as unknown as Response;
            }
          }
          return undefined;
        },
      ],
      beforeError: [
        async ({ error }) => {
          if ("response" in error && error.response) {
            const response = error.response as Response;
            let body: SMXPErrorBody;
            try {
              body = (await response.clone().json()) as SMXPErrorBody;
            } catch {
              body = {
                error: response.statusText || `HTTP ${response.status}`,
              };
            }
            return createSMXPError(response.status, body);
          }
          return new SMXPNetworkError(
            error.message || "Network request failed",
            error,
          );
        },
      ],
    },
    ...(kyOptions as object),
  });

  return instance;
}

export function createAdminHttpClient(
  config: AdminHttpClientConfig,
): KyInstance {
  const { baseUrl, adminSecret, timeout, retries, headers, kyOptions } = config;

  return ky.create({
    prefix: normalizeBaseUrl(baseUrl),
    timeout,
    retry: {
      limit: retries,
      statusCodes: [408, 429, 500, 502, 503, 504],
      methods: ["get", "post", "put", "delete"],
    },
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${adminSecret}`,
      ...headers,
    },
    hooks: {
      beforeError: [
        async ({ error }) => {
          if ("response" in error && error.response) {
            const response = error.response as Response;
            let body: SMXPErrorBody;
            try {
              body = (await response.clone().json()) as SMXPErrorBody;
            } catch {
              body = {
                error: response.statusText || `HTTP ${response.status}`,
              };
            }
            return createSMXPError(response.status, body);
          }
          return new SMXPNetworkError(
            error.message || "Network request failed",
            error,
          );
        },
      ],
    },
    ...(kyOptions as object),
  });
}
