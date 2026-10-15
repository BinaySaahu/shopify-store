import { NextResponse } from "next/server";
import { getProducts } from "@/lib/shopify";

export async function GET() {
  try {
    return NextResponse.json({ products: await getProducts() });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load products.";
    console.error("Product catalog request failed:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
