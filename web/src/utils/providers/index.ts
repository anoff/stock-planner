/**
 * Provider registry.
 *
 * Import PROVIDERS to get the full list of supported brokers.
 * Import individual providers (dab, rakuten) if you need a single config.
 *
 * To add a new provider:
 *   1. Create a new file in this directory that exports a default ProviderConfig.
 *   2. Import it here and add it to the PROVIDERS array.
 *   No other files need to change.
 */

export type { ProviderConfig } from "./types";

export { default as dab } from "./dab";
export { default as rakuten } from "./rakuten";

import dab from "./dab";
import rakuten from "./rakuten";

/** Ordered list of all supported providers shown in the selector UI. */
export const PROVIDERS = [rakuten, dab] as const;
