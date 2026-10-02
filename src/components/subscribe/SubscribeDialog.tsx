"use client";

import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Check, Crown, X } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { FREEMIUM_FEATURES } from "@/lib/freemium";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatPrice, type PlanId } from "@/lib/subscription/plans";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

interface SubscribeDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Pricing and checkout for SAI Prime.
 *
 * This only starts a checkout; it never grants access. The entitlement is
 * written server-side from the provider's webhook or the signed return trip.
 */
export default function SubscribeDialog({ open, onClose }: SubscribeDialogProps) {
  const { t, format } = useI18n();
  const { openSignIn, openSignUp } = useClerk();
  const {
    isLoaded,
    isSignedIn,
    isSubscribed,
    subscription,
    plans,
    providers,
    planId,
    provider,
    setPlanId,
    setProvider,
  } = useSubscription();

  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (target: PlanId) => {
    if (!provider) {
      setError(t.subscribe.unavailable);
      return;
    }

    setError(null);
    setIsStarting(true);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: target, provider }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.redirectUrl) {
        setError(data?.error ?? t.subscribe.failed);
        setIsStarting(false);
        return;
      }

      // Hands off to the gateway; the app picks entitlement back up on return.
      window.location.assign(data.redirectUrl);
    } catch {
      setError(t.subscribe.failed);
      setIsStarting(false);
    }
  };

  const requestSignIn = () => {
    if (openSignIn) openSignIn();
    else if (openSignUp) openSignUp();
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-overlay-in"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel
          data-testid="subscribe-dialog"
          className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-panel"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Crown className="size-5" />
              </span>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {t.subscribe.title}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            {t.subscribe.subtitle}
          </p>

          {isSubscribed ? (
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <Check className="size-4" />
                {t.subscribe.active}
              </p>
              {subscription?.currentPeriodEnd && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {format(t.subscribe.activeUntil, {
                    date: new Date(subscription.currentPeriodEnd).toLocaleDateString(),
                  })}
                </p>
              )}
              <Button variant="outline" className="mt-4 w-full" onClick={onClose}>
                {t.status.dismiss}
              </Button>
            </div>
          ) : (
            <>
              {/* Plan toggle */}
              <div
                role="radiogroup"
                aria-label={t.subscribe.choosePlan}
                className="mt-6 grid grid-cols-2 gap-2"
              >
                {(["monthly", "yearly"] as const).map((id) => {
                  const plan = plans.find((p) => p.id === id);
                  const selected = planId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPlanId(id)}
                      className={cn(
                        "rounded-xl border p-3 text-start transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <span className="block text-sm font-medium">
                        {id === "monthly" ? t.subscribe.monthly : t.subscribe.yearly}
                      </span>
                      <span className="mt-0.5 block text-xl font-semibold">
                        {plan ? formatPrice(plan.amount) : "—"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {id === "monthly" ? t.subscribe.perMonth : t.subscribe.perYear}
                      </span>
                    </button>
                  );
                })}
              </div>

              <ul className="mt-5 space-y-2">
                {t.subscribe.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>

              {/* What changes when the plan starts. Students hit the free caps
                  before they ever see this, so the jump has to be explicit. */}
              <div className="mt-5 overflow-hidden rounded-xl border">
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 bg-muted/50 px-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>{t.subscribe.compareFeature}</span>
                  <span className="w-20 text-center">{t.subscribe.compareFree}</span>
                  <span className="w-20 text-center text-primary">
                    {t.subscribe.comparePrime}
                  </span>
                </div>
                <div className="divide-y">
                  {FREEMIUM_FEATURES.map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 px-3 py-2 text-xs"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{row.label}</span>
                        <span className="block text-muted-foreground">
                          {row.description}
                        </span>
                      </span>
                      <span className="w-20 text-center text-muted-foreground">
                        {row.free}
                      </span>
                      <span className="w-20 text-center font-medium text-primary">
                        {row.prime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-4 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="mt-6 space-y-2">
                {!isSignedIn ? (
                  <Button className="w-full" onClick={requestSignIn}>
                    {t.subscribe.signInFirst}
                  </Button>
                ) : !isLoaded || !plans.length ? (
                  <Button className="w-full" disabled>
                    {t.subscribe.loading}
                  </Button>
                ) : providers.length === 0 ? (
                  <Button className="w-full" disabled>
                    {t.subscribe.unavailable}
                  </Button>
                ) : (
                  providers.map((option) => (
                    <Button
                      key={option.id}
                      variant={provider === option.id ? "default" : "outline"}
                      className="w-full"
                      disabled={isStarting}
                      onClick={() => {
                        setProvider(option.id);
                        void startCheckout(planId);
                      }}
                    >
                      {isStarting && provider === option.id
                        ? t.status.thinking
                        : format(t.subscribe.continueWith, {
                            provider: option.label,
                          })}
                    </Button>
                  ))
                )}
              </div>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                {plans.find((p) => p.id === planId)?.blurb}
              </p>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
