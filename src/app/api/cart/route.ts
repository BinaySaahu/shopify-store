import { NextResponse } from "next/server";
import { storefrontRequest } from "@/lib/shopify";
import type { CartLine, Product } from "@/types/store";

const CART_FIELDS = `
  id
  lines(first: 50) {
    nodes {
      id
      quantity
      merchandise {
        ... on ProductVariant {
          id
          title
          availableForSale
          price { amount currencyCode }
          product {
            id
            title
            handle
            images(first: 1) {
              nodes { url altText }
            }
          }
        }
      }
    }
  }
`;

type ShopifyCart = {
  id: string;
  lines: {
    nodes: Array<{
      id: string;
      quantity: number;
      merchandise: CartLine["variant"] & {
        product: Pick<Product, "id" | "title" | "handle"> & {
          images: { nodes: Product["images"] };
        };
      };
    }>;
  };
};

type CartPayload = {
  cart?: ShopifyCart | null;
  userErrors?: Array<{ message: string }>;
};

const CART_QUERY = `query GetCart($cartId: ID!) {
  cart(id: $cartId) { ${CART_FIELDS} }
}`;

function toCart(cart: ShopifyCart) {
  return {
    id: cart.id,
    lines: cart.lines.nodes.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      variant: {
        id: line.merchandise.id,
        title: line.merchandise.title,
        availableForSale: line.merchandise.availableForSale,
        price: line.merchandise.price,
      },
      product: {
        ...line.merchandise.product,
        images: line.merchandise.product.images.nodes,
      },
    })),
  };
}

function isCartId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("gid://shopify/Cart/") && value.length < 500;
}

function isVariantId(value: unknown): value is string {
  return typeof value === "string" && /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(value);
}

async function mutateCart(
  query: string,
  variables: Record<string, unknown>,
  field: string,
) {
  const data = await storefrontRequest<Record<string, CartPayload>>(query, variables);
  const payload = data[field];
  if (!payload) throw new Error("Shopify returned an invalid cart response.");
  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors.map((error) => error.message).join("; "));
  }
  if (!payload.cart) throw new Error("Shopify did not return a cart.");
  return toCart(payload.cart);
}

export async function GET(request: Request) {
  const cartId = new URL(request.url).searchParams.get("cartId");
  if (!isCartId(cartId)) {
    return NextResponse.json({ error: "A valid cart ID is required." }, { status: 400 });
  }

  try {
    const data = await storefrontRequest<{ cart: ShopifyCart | null }>(CART_QUERY, { cartId });
    if (!data.cart) return NextResponse.json({ error: "This cart is no longer available." }, { status: 404 });
    return NextResponse.json({ cart: toCart(data.cart) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the cart.";
    console.error("Shopify cart request failed:", message);
    return NextResponse.json({ error: "We couldn’t load your bag. Please try again." }, { status: 502 });
  }
}

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
  const body = value as Record<string, unknown>;

  const action = body.action;
  const cartId = body.cartId;
  let query: string;
  let variables: Record<string, unknown>;
  let field: string;

  if (action === "add") {
    if (
      !isVariantId(body.merchandiseId) ||
      !Number.isInteger(body.quantity) ||
      Number(body.quantity) < 1 ||
      Number(body.quantity) > 99 ||
      (cartId !== undefined && !isCartId(cartId))
    ) {
      return NextResponse.json({ error: "The item to add is invalid." }, { status: 400 });
    }

    const lines = [{ merchandiseId: body.merchandiseId, quantity: body.quantity }];
    if (cartId) {
      query = `mutation AddCartLines($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart { ${CART_FIELDS} }
          userErrors { message }
        }
      }`;
      variables = { cartId, lines };
      field = "cartLinesAdd";
    } else {
      query = `mutation CreateCart($lines: [CartLineInput!]!) {
        cartCreate(input: { lines: $lines }) {
          cart { ${CART_FIELDS} }
          userErrors { message }
        }
      }`;
      variables = { lines };
      field = "cartCreate";
    }
  } else if (action === "update") {
    if (
      !isCartId(cartId) ||
      typeof body.lineId !== "string" ||
      !body.lineId.startsWith("gid://shopify/CartLine/") ||
      !Number.isInteger(body.quantity) ||
      Number(body.quantity) < 1 ||
      Number(body.quantity) > 99
    ) {
      return NextResponse.json({ error: "The cart update is invalid." }, { status: 400 });
    }
    query = `mutation UpdateCartLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ${CART_FIELDS} }
        userErrors { message }
      }
    }`;
    variables = { cartId, lines: [{ id: body.lineId, quantity: body.quantity }] };
    field = "cartLinesUpdate";
  } else if (action === "remove") {
    if (
      !isCartId(cartId) ||
      typeof body.lineId !== "string" ||
      !body.lineId.startsWith("gid://shopify/CartLine/")
    ) {
      return NextResponse.json({ error: "The cart removal is invalid." }, { status: 400 });
    }
    query = `mutation RemoveCartLines($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ${CART_FIELDS} }
        userErrors { message }
      }
    }`;
    variables = { cartId, lineIds: [body.lineId] };
    field = "cartLinesRemove";
  } else {
    return NextResponse.json({ error: "Unsupported cart action." }, { status: 400 });
  }

  try {
    const cart = await mutateCart(query, variables, field);
    return NextResponse.json({ cart });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the cart.";
    console.error("Shopify cart update failed:", message);
    return NextResponse.json({ error: "We couldn’t update your bag. Please try again." }, { status: 502 });
  }
}
