// ─────────────────────────────────────────────────────────────────────────────
// SMXP SDK — Auth Manager
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Credentials,
  CustomTokenStorage,
  LoginResponse,
} from "./types.js";

export interface AuthManagerConfig {
  storage: CustomTokenStorage;
  credentials?: Credentials;
  autoRefresh: boolean;
  autoRelogin: boolean;
  maxReloginAttempts: number;
  onTokenRefresh?: (token: string, expiresAt?: number) => void;
  onAuthFailure?: (error: Error) => void;
  loginFn?: (credentials: Credentials) => Promise<LoginResponse>;
}

export class AuthManager {
  private readonly _storage: CustomTokenStorage;
  private readonly _credentials: Credentials | undefined;
  private readonly _autoRefresh: boolean;
  private readonly _autoRelogin: boolean;
  private readonly _maxReloginAttempts: number;
  private readonly _onTokenRefresh:
    | ((token: string, expiresAt?: number) => void)
    | undefined;
  private readonly _onAuthFailure: ((error: Error) => void) | undefined;

  private _reloginAttempts: number = 0;
  private _reloginPromise: Promise<string | null> | null = null;
  private _loginFn:
    | ((credentials: Credentials) => Promise<LoginResponse>)
    | undefined;

  constructor(config: AuthManagerConfig) {
    this._storage = config.storage;
    this._credentials = config.credentials;
    this._autoRefresh = config.autoRefresh;
    this._autoRelogin = config.autoRelogin;
    this._maxReloginAttempts = config.maxReloginAttempts;
    this._onTokenRefresh = config.onTokenRefresh;
    this._onAuthFailure = config.onAuthFailure;
    this._loginFn = config.loginFn;
  }

  setLoginFn(fn: (credentials: Credentials) => Promise<LoginResponse>): void {
    this._loginFn = fn;
  }

  async getToken(): Promise<string | null> {
    return await this._storage.get();
  }

  getTokenSync(): string | null {
    const result = this._storage.get();
    if (result instanceof Promise) {
      return null;
    }
    return result;
  }

  async setToken(token: string, expiresAt?: number): Promise<void> {
    await this._storage.set(token, expiresAt);
    this._reloginAttempts = 0;
  }

  async removeToken(): Promise<void> {
    await this._storage.remove();
  }

  async handleRefresh(newToken: string, expiresAt?: number): Promise<void> {
    if (!this._autoRefresh) return;
    await this.setToken(newToken, expiresAt);
    this._onTokenRefresh?.(newToken, expiresAt);
  }

  async attemptRelogin(): Promise<string | null> {
    if (!this._autoRelogin || !this._credentials || !this._loginFn) {
      return null;
    }

    if (this._reloginAttempts >= this._maxReloginAttempts) {
      const error = new Error("Maximum re-login attempts exceeded");
      this._onAuthFailure?.(error);
      return null;
    }

    // De-duplicate concurrent re-login attempts
    if (this._reloginPromise) {
      return this._reloginPromise;
    }

    this._reloginPromise = this._performRelogin();
    const result = await this._reloginPromise;
    this._reloginPromise = null;
    return result;
  }

  private async _performRelogin(): Promise<string | null> {
    this._reloginAttempts++;

    try {
      const response = await this._loginFn!(this._credentials!);
      await this.setToken(response.token, response.expires_at);
      this._onTokenRefresh?.(response.token, response.expires_at);
      return response.token;
    } catch (error: unknown) {
      if (this._reloginAttempts >= this._maxReloginAttempts) {
        const err = error instanceof Error ? error : new Error(String(error));
        this._onAuthFailure?.(err);
      }
      return null;
    }
  }

  resetAttempts(): void {
    this._reloginAttempts = 0;
  }

  get hasCredentials(): boolean {
    return this._credentials !== undefined;
  }

  get credentials(): Credentials | undefined {
    return this._credentials;
  }
}
