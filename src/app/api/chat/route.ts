import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { getProducts } from "@/lib/shopify";

type ChatRequest = {
  message?: unknown;
};

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Product chat is not configured. Add GROQ_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const body = value as ChatRequest;

  if (
    typeof body.message !== "string" ||
    body.message.trim().length === 0 ||
    body.message.length > 1000
  ) {
    return NextResponse.json(
      { error: "Please send a valid message." },
      { status: 400 },
    );
  }

  try {
    const catalog = await getProducts();
    const products = catalog
      .filter((product) => product.variants.some((variant) => variant.availableForSale))
      .map((product) => ({
        id: product.id,
        title: product.title.slice(0, 160),
        description: product.description.slice(0, 400),
        productType: product.productType.slice(0, 100),
        price: product.priceRange.minVariantPrice.amount,
        currencyCode: product.priceRange.minVariantPrice.currencyCode,
        variants: product.variants
          .filter((variant) => variant.availableForSale)
          .slice(0, 15)
          .map((variant) => ({
            id: variant.id,
            title: variant.title.slice(0, 100),
            price: variant.price.amount,
            currencyCode: variant.price.currencyCode,
          })),
      }));
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are Innovist's shopping assistant. Use only the supplied Shopify catalogue. Never invent a product, price, feature, benefit, stock status, discount, or policy. For product recommendation, budget, or comparison requests, recommend up to three matching available catalogue products. Give each recommendation a short reason based only on the product's supplied title, description, type, and price. If nothing fits or the catalogue lacks enough information, say so and return no recommendations. For comparisons, only compare products in the catalogue. Do not put prices in your answer; the storefront displays verified prices. For other questions, answer helpfully and return no recommendations unless useful. Return JSON only in this exact shape: {"answer":"short response","recommendations":[{"productId":"exact Shopify product id","reason":"catalogue-grounded reason"}]}. Recommendation productId values must be copied exactly from the catalogue.`,
        },
        {
          role: "user",
          content: `Shopify catalogue:\n${JSON.stringify(products)}\n\nCustomer question: ${body.message.trim()}`,
        },
      ],
      model: process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "The shopping assistant returned an empty response." },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(content) as {
      answer?: unknown;
      recommendations?: unknown;
    };
    if (
      typeof parsed.answer !== "string" ||
      !Array.isArray(parsed.recommendations)
    ) {
      throw new Error("The shopping assistant returned an invalid response.");
    }

    const catalogById = new Map(products.map((product) => [product.id, product]));
    const recommendations = parsed.recommendations
      .filter(
        (item): item is { productId: string; reason: string } =>
          !!item &&
          typeof item === "object" &&
          typeof (item as Record<string, unknown>).productId === "string" &&
          typeof (item as Record<string, unknown>).reason === "string" &&
          (item as Record<string, unknown>).reason !== "",
      )
      .filter(
        (item, index, list) =>
          list.findIndex((candidate) => candidate.productId === item.productId) === index &&
          catalogById.has(item.productId),
      )
      .slice(0, 3)
      .map((item) => ({
        productId: item.productId,
        reason: item.reason.slice(0, 240),
      }));

    return NextResponse.json({
      answer: parsed.answer.slice(0, 1000),
      recommendations,
    });
  } catch (error) {
    console.error("Shopping assistant request failed:", error);
    return NextResponse.json(
      { error: "The shopping assistant is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
