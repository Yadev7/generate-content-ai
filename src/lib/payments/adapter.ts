import type { PaymentEvent, ProviderId } from "../subscription/types";
import type { PlanId } from "../subscription/plans";

export interface CheckoutRequest {
  planId: PlanId;
  userId: string;
  email: string;
  /** Absolute URL the provider returns the user to after paying. */
  returnUrl: string;
  /** Absolute URL for a cancelled/abandoned checkout. */
  cancelUrl: string;
  /** Opaque id we can match the provider's callback back to this attempt. */
  reference: string;
}

export interface CheckoutSession {
  /** Where to send the browser to complete payment. */
  redirectUrl: string;
}

export interface WebhookRequest {
  headers: Record<string, string>;
  /** Raw body, required for signature verification. */
  body: string;
}

export interface PaymentAdapter {
  id: ProviderId;
  label: string;
  /** False when credentials are missing; such providers are hidden from the UI. */
  isConfigured(): boolean;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  /**
   * Verifies authenticity of a provider callback and normalises it.
   * Must throw if the payload cannot be trusted.
   */
  parseWebhook(request: WebhookRequest): Promise<PaymentEvent | null>;
  /**
   * Called on the return trip when the provider sends the user back with an
   * order token (PayPal's `token=`). Used to finalise payments when webhooks
   * are not reachable, e.g. local development.
   */
  completeReturn?(query: Record<string, string>): Promise<PaymentEvent | null>;
}
