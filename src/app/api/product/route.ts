import { NextResponse } from "next/server";
import { getProduct } from "@/lib/shopify";

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("id");
  if (!productId) {
    return NextResponse.json({ error: "A product ID or handle is required." }, { status: 400 });
  }

  try {
    const product = await getProduct(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the product.";
    console.error("Product request failed:", message);
    return NextResponse.json(
      { error: "We couldn’t load this product. Please try again." },
      { status: 503 },
    );
  }
}