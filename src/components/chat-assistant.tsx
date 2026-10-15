"use client";

import { FormEvent, useState } from "react";
import { Icon } from "@/components/icons";
import type { Product, ProductVariant } from "@/types/store";

type Recommendation = { productId: string; reason: string };
type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  recommendations?: Recommendation[];
};
type ChatResult = {
  answer?: string;
  recommendations?: Recommendation[];
  error?: string;
};
type ChatAssistantProps = {
  products: Product[];
  onAddToCart: (product: Product, variant: ProductVariant) => void;
  addDisabled?: boolean;
};

function RecommendedProduct({
  product,
  onAddToCart,
  disabled,
}: {
  product: Product;
  onAddToCart: ChatAssistantProps["onAddToCart"];
  disabled: boolean;
}) {
  const availableVariants = product.variants.filter((variant) => variant.availableForSale);
  const [variantId, setVariantId] = useState(availableVariants[0]?.id ?? "");
  const selectedVariant =
    availableVariants.find((variant) => variant.id === variantId) ?? availableVariants[0];
  const image = product.images[0];

  return (
    <article className="chat-recommendation">
      <div
        aria-label={image?.altText || product.title}
        className="chat-recommendation-image"
        role="img"
        style={image ? { backgroundImage: `url("${image.url}")` } : undefined}
      />
      <div className="chat-recommendation-content">
        <h4 className="chat-recommendation-title">{product.title}</h4>
        <div className="chat-recommendation-actions">
          <label>
            <span className="sr-only">Choose an option for {product.title}</span>
            <select
              aria-label={`Choose an option for ${product.title}`}
              disabled={availableVariants.length === 0}
              onChange={(event) => setVariantId(event.target.value)}
              value={variantId}
            >
              {availableVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.title}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-label={`Add ${product.title} to bag`}
            className="add-button"
            disabled={!selectedVariant || disabled}
            onClick={() => selectedVariant && onAddToCart(product, selectedVariant)}
            type="button"
          >
            <Icon name="plus" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export function ChatAssistant({
  products,
  onAddToCart,
  addDisabled = false,
}: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi there. Looking for a little guidance? Ask for recommendations, ideas within a budget, or a product comparison.",
    },
  ]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const catalogById = new Map(products.map((product) => [product.id, product]));

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = message.trim();
    if (!content || isSending) return;

    setMessages((current) => [...current, { role: "user", content }]);
    setMessage("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const result = (await response.json()) as ChatResult;
      if (!response.ok || !result.answer) {
        throw new Error(result.error || "The assistant couldn’t respond. Please try again.");
      }
      const recommendations = (result.recommendations ?? []).filter(
        (recommendation) =>
          catalogById.has(recommendation.productId) &&
          catalogById.get(recommendation.productId)!.variants.some((variant) => variant.availableForSale),
      );
      const reasons = recommendations
        .map((recommendation) => {
          const product = catalogById.get(recommendation.productId);
          return product ? `${product.title}: ${recommendation.reason}` : "";
        })
        .filter(Boolean);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: [result.answer, ...reasons].join("\n\n"),
          recommendations,
        },
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The assistant couldn’t respond.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="chat-widget">
      <aside aria-label="Shopping assistant" className="assistant-card" hidden={!isOpen}>
        <div className="assistant-header">
          <span className="assistant-orb"><Icon name="spark" /></span>
          <div>
            <h2>A little help?</h2>
            <p>Your personal product guide</p>
          </div>
          <span className="online-dot" aria-label="Assistant ready" />
          <button
            aria-label="Close shopping assistant"
            className="chat-close-button"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>
        <div aria-live="polite" className="chat-messages">
          {messages.map((item, index) => (
            <div className={`chat-message-wrap ${item.role}`} key={`${item.role}-${index}`}>
              <p className={`chat-message ${item.role}`}>{item.content}</p>
              {item.recommendations?.map((recommendation) => {
                const product = catalogById.get(recommendation.productId);
                if (!product) return null;
                return (
                  <RecommendedProduct
                    disabled={addDisabled}
                    key={recommendation.productId}
                    onAddToCart={onAddToCart}
                    product={product}
                  />
                );
              })}
            </div>
          ))}
          {isSending && <p className="chat-message assistant typing">Finding a thoughtful answer…</p>}
        </div>
        {error && <p className="chat-error" role="alert">{error}</p>}
        <form className="chat-form" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="chat-message">Ask about the collection</label>
          <input
            id="chat-message"
            maxLength={1000}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask for products or comparisons..."
            value={message}
          />
          <button aria-label="Send message" disabled={!message.trim() || isSending} type="submit">
            <Icon name="arrow" />
          </button>
        </form>
        <p className="assistant-note">Product guidance, made simple.</p>
      </aside>
      {!isOpen && (
        <button
          aria-label="Open shopping assistant"
          className="chat-launcher"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <Icon name="spark" />
          <span>Need help?</span>
        </button>
      )}
    </div>
  );
}
