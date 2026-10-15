import { NextResponse } from "next/server";

type ChatProduct = {
  title: string;
  description: string;
  price: string;
  currencyCode: string;
  variants: string[];
};

type ChatRequest = {
  message?: unknown;
  products?: unknown;
};

function isChatProduct(value: unknown): value is ChatProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as Record<string, unknown>;
  return (
    typeof product.title === "string" &&
    typeof product.description === "string" &&
    typeof product.price === "string" &&
    typeof product.currencyCode === "string" &&
    Array.isArray(product.variants) &&
    product.variants.every((variant) => typeof variant === "string")
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Product chat is not configured. Add OPENAI_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    typeof body.message !== "string" ||
    body.message.trim().length === 0 ||
    body.message.length > 1000 ||
    !Array.isArray(body.products) ||
    body.products.length > 12 ||
    !body.products.every(isChatProduct)
  ) {
    return NextResponse.json(
      { error: "Please send a message and a valid, limited product list." },
      { status: 400 },
    );
  }

  const products = body.products.map((product) => ({
    title: product.title.slice(0, 160),
    description: product.description.slice(0, 400),
    price: product.price.slice(0, 40),
    currencyCode: product.currencyCode.slice(0, 8),
    variants: product.variants.slice(0, 15).map((variant) => variant.slice(0, 100)),
  }));

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 350,
        messages: [
          {
            role: "system",
            content:
              "You are the helpful shopping assistant for Innovist. Answer using only the product information provided. Do not invent product details, stock levels, policies, or discounts. If the catalog does not answer a question, say so briefly and offer to help with something else.",
          },
          {
            role: "user",
            content: `Catalog products:\n${JSON.stringify(products)}\n\nCustomer question: ${body.message.trim()}`,
          },
        ],
      }),
    });

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      console.error("AI provider request failed:", result.error?.message);
      return NextResponse.json(
        { error: "The shopping assistant is temporarily unavailable. Please try again." },
        { status: 502 },
      );
    }

    const answer = result.choices?.[0]?.message?.content;
    if (!answer) {
      return NextResponse.json(
        { error: "The shopping assistant returned an empty response." },
        { status: 502 },
      );
    }
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Shopping assistant request failed:", error);
    return NextResponse.json(
      { error: "The shopping assistant is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
