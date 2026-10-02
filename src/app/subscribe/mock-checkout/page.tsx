import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice, isPlanId, PLANS } from "@/lib/subscription/plans";
import { isMockPaymentsEnabled } from "@/lib/payments";

/**
 * Stand-in for a gateway's hosted payment page, used only when no real
 * provider is configured. It lets the whole subscribe -> unlock journey be
 * tested without merchant credentials.
 *
 * Confirming hands off to `/subscribe/return`, the same path a real gateway
 * uses, so the flow being tested here is the production one.
 */
export default function MockCheckoutPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  if (!isMockPaymentsEnabled()) redirect("/");

  const planParam = first(searchParams.plan);
  const reference = first(searchParams.reference) ?? "";

  if (!isPlanId(planParam) || !reference) redirect("/");
  const plan = PLANS[planParam];

  const confirm = `/subscribe/return?provider=mock&reference=${encodeURIComponent(reference)}`;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Test payment
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          SAI Prime — every {plan.interval}
        </h1>
        <p className="mt-1 text-3xl font-semibold">{formatPrice(plan.amount)}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          No real charge is made. Confirming writes the entitlement to your
          account so you can test the unlocked assistant.
        </p>

        <div className="mt-6 flex gap-2">
          <Link href={confirm} className={cn(buttonVariants(), "flex-1")}>
            Confirm payment
          </Link>
          <Link
            href="/?checkout=cancelled"
            className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
          >
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
