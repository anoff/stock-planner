import type { ProviderConfig } from "./types";
import { parseDABTrades, isDABFormat } from "../csv";

/**
 * DAB bank provider configuration.
 *
 * Supports the "Orderhistorie" CSV export from the DAB bank online portal.
 * All amounts are in EUR (the broker settles in EUR at trade time).
 */
const dab: ProviderConfig = {
  id: "dab",
  name: "DAB bank",
  description: "Order history CSV (Orderhistorie)",
  currency: "EUR",
  validate: isDABFormat,
  parse: parseDABTrades,
};

export default dab;
