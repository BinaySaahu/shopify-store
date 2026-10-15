import { NextResponse } from "next/server";
import { storefrontRequest } from "@/lib/shopify";

export async function POST(request: Request) {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const body = value as { cartId?: unknown };

  if (
    typeof body.cartId !== "string" ||
    !body.cartId.startsWith("gid://shopify/Cart/") ||
    body.cartId.length >= 500
  ) {
    return NextResponse.json({ error: "The shopping bag is invalid." }, { status: 400 });
  }

  try {
    const result = await storefrontRequest<{
      cart: { checkoutUrl: string } | null;
    }>(
      `query GetCheckoutUrl($cartId: ID!) {
        cart(id: $cartId) { checkoutUrl }
      }`,
      { cartId: body.cartId },
    );
    const checkoutUrl = result.cart?.checkoutUrl;
    if (!checkoutUrl || new URL(checkoutUrl).protocol !== "https:") {
      throw new Error("Shopify did not return a valid checkout URL.");
    }
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout.";
    console.error("Shopify checkout request failed:", message);
    return NextResponse.json(
      { error: "We couldn’t start checkout. Please try again." },
      { status: 502 },
    );
  }
}
