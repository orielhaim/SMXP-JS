// ─────────────────────────────────────────────────────────────────────────────
// SMXP SDK — Utilities
// ─────────────────────────────────────────────────────────────────────────────

import type { PaginationOptions } from "./types.js";

export interface ParsedAddress {
  localPart: string;
  domain: string;
  address: string;
}

export function parseAddress(address: string): ParsedAddress {
  if (typeof address !== "string") {
    throw new Error("address must be a string");
  }

  const atIndex = address.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === address.length - 1) {
    throw new Error(`invalid address "${address}"`);
  }

  const localPart: string = address.slice(0, atIndex).trim().toLowerCase();
  const domain: string = address
    .slice(atIndex + 1)
    .trim()
    .toLowerCase();

  if (
    !localPart ||
    !domain ||
    localPart.includes("@") ||
    domain.includes("@")
  ) {
    throw new Error(`invalid address "${address}"`);
  }

  return { localPart, domain, address: `${localPart}@${domain}` };
}

export function formatAddress(localPart: string, domain: string): string {
  return `${localPart.trim().toLowerCase()}@${domain.trim().toLowerCase()}`;
}

export function isValidAddress(address: string): boolean {
  try {
    parseAddress(address);
    return true;
  } catch {
    return false;
  }
}

export function paginationToSearchParams(
  options?: PaginationOptions,
): Record<string, string> {
  if (!options) return {};

  const params: Record<string, string> = {};
  if (options.limit !== undefined) {
    params["limit"] = String(Math.min(Math.max(1, options.limit), 100));
  }
  if (options.after) {
    params["after"] = options.after;
  }
  if (options.before) {
    params["before"] = options.before;
  }
  return params;
}
