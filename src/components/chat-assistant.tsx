"use client";

import { FormEvent, useState } from "react";
import { Icon } from "@/components/icons";
import type { Product } from "@/types/store";

type ChatMessage = { role: "assistant" | "user"; content: string };
type ChatAssistantProps = { products: Product[] };

export function ChatAssistant({ products }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi there. Looking for a little guidance? Tell me what you’re shopping for.",
    },
  ]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

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
        body: JSON.stringify({
          message: content,
          products: products.slice(0, 12).map((product) => ({
            title: product.title,
            description: product.description.slice(0, 400),
            price: product.priceRange.minVariantPrice.amount,
            currencyCode: product.priceRange.minVariantPrice.currencyCode,
            variants: product.variants
              .filter((variant) => variant.availableForSale)
              .slice(0, 15)
              .map((variant) => variant.title),
          })),
        }),
      });
      const result = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok || !result.answer) {
        throw new Error(result.error || "The assistant couldn’t respond. Please try again.");
      }
      setMessages((current) => [...current, { role: "assistant", content: result.answer! }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The assistant couldn’t respond.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <aside aria-label="Shopping assistant" className="assistant-card">
      <div className="assistant-header">
        <span className="assistant-orb"><Icon name="spark" /></span>
        <div>
          <h2>A little help?</h2>
          <p>Your personal product guide</p>
        </div>
        <span className="online-dot" aria-label="Assistant ready" />
      </div>
      <div aria-live="polite" className="chat-messages">
        {messages.map((item, index) => (
          <p className={`chat-message ${item.role}`} key={`${item.role}-${index}`}>{item.content}</p>
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
          placeholder="Ask us anything..."
          value={message}
        />
        <button aria-label="Send message" disabled={!message.trim() || isSending} type="submit">
          <Icon name="arrow" />
        </button>
      </form>
      <p className="assistant-note">Product guidance, made simple.</p>
    </aside>
  );
}
