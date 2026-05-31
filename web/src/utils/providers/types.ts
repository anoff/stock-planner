import type { Trade } from "../types";

/**
 * Describes a supported broker / data-provider.
 *
 * Each provider encapsulates:
 *  - its display identity (id, name, description)
 *  - the base currency all its amounts are denominated in
 *  - a format validator — returns true when a CSV text looks like an export
 *    from this provider (used for consistency-checking uploaded files)
 *  - a parser — converts the CSV text into Trade objects
 *
 * To add a new provider, create a new file in this directory that exports a
 * default ProviderConfig and add it to the PROVIDERS array in index.ts.
 * No other interfaces need to change.
 */
export interface ProviderConfig {
  /** Stable identifier used in state and keys. */
  id: string;
  /** Human-readable name shown in the provider selector (proper noun, not translated). */
  name: string;
  /** Short description of the expected file format shown below the name card. */
  description: string;
  /** Base currency for all cost and value amounts produced by this provider. */
  currency: "EUR" | "JPY";
  /**
   * Returns true when the CSV text matches this provider's format.
   * Used after file selection to catch mismatches between the chosen provider
   * and the actual file content, surfacing a clear error rather than silently
   * producing wrong data.
   */
  validate: (csvText: string) => boolean;
  /** Parse the CSV text and return all trades (buy + sell). */
  parse: (csvText: string) => Trade[];
}
