import "server-only";

import type { ProviderId } from "../subscription/types";
import type { PaymentAdapter } from "./adapter";
import { isMockPaymentsEnabled, mockAdapter } from "./mock";
import { paypalAdapter } from "./paypal";
import { payzoneAdapter } from "./payzone";

export { isMockPaymentsEnabled } from "./mock";

const ADAPTERS: Record<ProviderId, PaymentAdapter> = {
  paypal: paypalAdapter,
  payzone: payzoneAdapter,
  mock: mockAdapter,
};

export function getAdapter(id: ProviderId): PaymentAdapter {
  const adapter = ADAPTERS[id];
  if (!adapter) throw new Error(`Unknown payment provider: ${id}`);
  return adapter;
}

export interface AvailableProvider {
  id: ProviderId;
  label: string;
}

/**
 * Providers offered in the pricing dialog. Anything without credentials is
 * hidden rather than shown-and-failing, and the mock provider is only offered
 * while no real gateway is configured.
 */
export function availableProviders(): AvailableProvider[] {
  const real = [paypalAdapter, payzoneAdapter].filter((a) => a.isConfigured());
  const list: AvailableProvider[] = real.map((a) => ({ id: a.id, label: a.label }));
  if (list.length === 0 && isMockPaymentsEnabled()) {
    list.push({ id: "mock", label: mockAdapter.label });
  }
  return list;
}
