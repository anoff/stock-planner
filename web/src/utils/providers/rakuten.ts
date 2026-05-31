import type { ProviderConfig } from "./types";
import { parseRakutenTrades, isRakutenFormat } from "../csv";

/**
 * Rakuten Securities provider configuration.
 *
 * Supports all three Rakuten trade-history CSV sub-formats:
 *   - tradehistory(JP)_*.csv    — Japanese stocks
 *   - tradehistory(US)_*.csv    — US stocks
 *   - tradehistory(INVST)_*.csv — Investment trusts (investment funds)
 *
 * All amounts are in JPY.
 */
const rakuten: ProviderConfig = {
  id: "rakuten",
  name: "Rakuten Securities",
  description: "Trade history CSV (JP, US, or investment trust)",
  currency: "JPY",
  validate: isRakutenFormat,
  parse: parseRakutenTrades,
};

export default rakuten;
