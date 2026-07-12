export type { BrokerAdapter } from "./broker-adapter.interface";
export { MockBrokerAdapter } from "./mock-broker-adapter";
export { CTraderBrokerAdapter } from "./ctrader-broker-adapter";

import type { BrokerEnvironment } from "@/types";
import type { BrokerAdapter } from "./broker-adapter.interface";
import { MockBrokerAdapter } from "./mock-broker-adapter";
import { CTraderBrokerAdapter } from "./ctrader-broker-adapter";

export type BrokerAdapterType = "mock" | "ctrader";

export function createBrokerAdapter(
  type: BrokerAdapterType,
  environment: BrokerEnvironment = "demo",
  accessToken?: string
): BrokerAdapter {
  if (type === "ctrader" && accessToken) {
    return new CTraderBrokerAdapter(environment, accessToken);
  }
  return new MockBrokerAdapter(environment);
}
