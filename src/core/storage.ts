import type { CustomTokenStorage, TokenStorage } from "./types.js";

const STORAGE_KEY = "smxp_session_token";
const STORAGE_EXPIRY_KEY = "smxp_session_expires_at";

function getLocalStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

class MemoryStorage implements CustomTokenStorage {
  private _token: string | null = null;
  private _expiresAt: number | undefined;

  get(): string | null {
    if (this._expiresAt !== undefined && Date.now() / 1000 > this._expiresAt) {
      this._token = null;
      this._expiresAt = undefined;
      return null;
    }
    return this._token;
  }

  set(token: string, expiresAt?: number): void {
    this._token = token;
    this._expiresAt = expiresAt;
  }

  remove(): void {
    this._token = null;
    this._expiresAt = undefined;
  }
}

class LocalStorageAdapter implements CustomTokenStorage {
  get(): string | null {
    const storage = getLocalStorage();
    if (!storage) return null;
    const expiresStr = storage.getItem(STORAGE_EXPIRY_KEY);
    if (expiresStr) {
      const expiresAt = Number(expiresStr);
      if (Date.now() / 1000 > expiresAt) {
        this.remove();
        return null;
      }
    }
    return storage.getItem(STORAGE_KEY);
  }

  set(token: string, expiresAt?: number): void {
    const storage = getLocalStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEY, token);
    if (expiresAt !== undefined) {
      storage.setItem(STORAGE_EXPIRY_KEY, String(expiresAt));
    }
  }

  remove(): void {
    const storage = getLocalStorage();
    if (!storage) return;
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(STORAGE_EXPIRY_KEY);
  }
}

class SessionStorageAdapter implements CustomTokenStorage {
  get(): string | null {
    const storage = getSessionStorage();
    if (!storage) return null;
    const expiresStr = storage.getItem(STORAGE_EXPIRY_KEY);
    if (expiresStr) {
      const expiresAt = Number(expiresStr);
      if (Date.now() / 1000 > expiresAt) {
        this.remove();
        return null;
      }
    }
    return storage.getItem(STORAGE_KEY);
  }

  set(token: string, expiresAt?: number): void {
    const storage = getSessionStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEY, token);
    if (expiresAt !== undefined) {
      storage.setItem(STORAGE_EXPIRY_KEY, String(expiresAt));
    }
  }

  remove(): void {
    const storage = getSessionStorage();
    if (!storage) return;
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(STORAGE_EXPIRY_KEY);
  }
}

export function createTokenStorage(
  type: TokenStorage,
  custom?: CustomTokenStorage,
): CustomTokenStorage {
  switch (type) {
    case "localStorage":
      return new LocalStorageAdapter();
    case "sessionStorage":
      return new SessionStorageAdapter();
    case "custom":
      if (!custom) {
        throw new Error(
          "customStorage must be provided when tokenStorage is 'custom'",
        );
      }
      return custom;
    case "memory":
    default:
      return new MemoryStorage();
  }
}
