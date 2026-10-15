"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import type { CartLine, ProductVariant } from "@/types/store";

type CartResult = { cart?: { id: string; lines: CartLine[] }; error?: string };

export type CartDrawerHandle = {
  open: () => void;
  add: (variant: ProductVariant, quantity?: number) => void;
};

type CartDrawerProps = {
  onItemCountChange: (count: number) => void;
  onReadyChange: (ready: boolean) => void;
};

function formatPrice(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const CartDrawer = forwardRef<CartDrawerHandle, CartDrawerProps>(
  function CartDrawer({ onItemCountChange, onReadyChange }, ref) {
    const [lines, setLines] = useState<CartLine[]>([]);
    const [cartId, setCartId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState("");
    const [checkoutError, setCheckoutError] = useState("");
    const [checkingOut, setCheckingOut] = useState(false);
    const updatingRef = useRef(false);

    useEffect(() => {
      void (async () => {
        try {
          const savedCartId = window.localStorage.getItem("innovist-cart-id");
          if (savedCartId) {
            const response = await fetch(`/api/cart?cartId=${encodeURIComponent(savedCartId)}`);
            const result = (await response.json()) as CartResult;
            if (!response.ok || !result.cart) {
              throw new Error(result.error || "We couldn’t restore your bag.");
            }
            setCartId(result.cart.id);
            setLines(result.cart.lines);
          }
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "We couldn’t restore your bag.";
          console.error("Unable to restore the saved shopping bag:", message);
          setError(message);
          try {
            window.localStorage.removeItem("innovist-cart-id");
          } catch (storageError) {
            console.error("Unable to clear the saved shopping bag ID:", storageError);
          }
        } finally {
          setLoading(false);
          onReadyChange(true);
        }
      })();
    }, [onReadyChange]);

    useEffect(() => {
      onItemCountChange(lines.reduce((count, line) => count + line.quantity, 0));
    }, [lines, onItemCountChange]);

    const updateCart = useCallback(async (body: Record<string, unknown>) => {
      if (loading || updatingRef.current) return;
      updatingRef.current = true;
      setUpdating(true);
      setError("");
      try {
        const response = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, ...(cartId ? { cartId } : {}) }),
        });
        const result = (await response.json()) as CartResult;
        if (!response.ok || !result.cart) {
          throw new Error(result.error || "We couldn’t update your bag. Please try again.");
        }
        setCartId(result.cart.id);
        setLines(result.cart.lines);
        try {
          window.localStorage.setItem("innovist-cart-id", result.cart.id);
        } catch (storageError) {
          console.error("Unable to save the shopping bag ID:", storageError);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "We couldn’t update your bag. Please try again.");
      } finally {
        updatingRef.current = false;
        setUpdating(false);
      }
    }, [cartId, loading]);

    useImperativeHandle(ref, () => ({
      open: () => setOpen(true),
      add: (variant, quantity = 1) => {
        setOpen(true);
        if (loading || updatingRef.current) return;
        const existingQuantity =
          lines.find((line) => line.variant.id === variant.id)?.quantity ?? 0;
        if (existingQuantity + quantity > 99) {
          setError("You’ve reached the maximum quantity for this item.");
          return;
        }
        void updateCart({ action: "add", merchandiseId: variant.id, quantity });
      },
    }), [loading, lines, updateCart]);

    async function startCheckout() {
      setCheckoutError("");
      setCheckingOut(true);
      try {
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartId }),
        });
        const result = (await response.json()) as { checkoutUrl?: string; error?: string };
        if (!response.ok || !result.checkoutUrl) {
          throw new Error(result.error || "We couldn’t start checkout. Please try again.");
        }
        window.location.assign(result.checkoutUrl);
      } catch (caught) {
        setCheckoutError(caught instanceof Error ? caught.message : "We couldn’t start checkout.");
        setCheckingOut(false);
      }
    }

    function changeQuantity(lineId: string, quantity: number) {
      void updateCart({
        action: quantity < 1 ? "remove" : "update",
        lineId,
        ...(quantity >= 1 ? { quantity } : {}),
      });
    }

    if (!open) return null;
    const itemCount = lines.reduce((count, line) => count + line.quantity, 0);
    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.variant.price.amount) * line.quantity,
      0,
    );
    const currency = lines[0]?.variant.price.currencyCode ?? "USD";
    const close = () => setOpen(false);

    return (
      <div className="drawer-backdrop" onMouseDown={close}>
        <aside
          aria-label="Shopping bag"
          aria-modal="true"
          className="cart-drawer"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="drawer-heading">
            <div>
              <span className="eyebrow">YOUR SELECTION</span>
              <h2>Your bag <span>({itemCount})</span></h2>
            </div>
            <button aria-label="Close shopping bag" className="icon-button" onClick={close} type="button">
              <Icon name="close" />
            </button>
          </div>
          {error && <p className="chat-error" role="alert">{error}</p>}
          {lines.length === 0 ? (
            loading || updating ? (
              <p aria-live="polite" className="cart-empty">Your bag is loading...</p>
            ) : (
              <div className="cart-empty">
                <div className="empty-bag-icon"><Icon name="bag" /></div>
                <h3>Your bag is taking a breather.</h3>
                <p>There’s nothing in here just yet. Find something you love.</p>
                <button className="text-link" onClick={close} type="button">Explore the collection <Icon name="arrow" /></button>
              </div>
            )
          ) : (
            <>
              <div className="cart-lines">
                {lines.map((line) => {
                  const image = line.product.images[0];
                  return (
                    <article className="cart-line" key={line.id}>
                      <div
                        aria-label={image?.altText || line.product.title}
                        className="cart-line-image"
                        role="img"
                        style={image ? { backgroundImage: `url("${image.url}")` } : undefined}
                      />
                      <div className="cart-line-info">
                        <h3>{line.product.title}</h3>
                        <p>{line.variant.title}</p>
                        <div className="quantity-control">
                          <button
                            aria-label={`Decrease quantity of ${line.product.title}`}
                            disabled={updating}
                            onClick={() => changeQuantity(line.id, line.quantity - 1)}
                            type="button"
                          ><Icon name="minus" /></button>
                          <span>{line.quantity}</span>
                          <button
                            aria-label={`Increase quantity of ${line.product.title}`}
                            disabled={updating || line.quantity >= 99}
                            onClick={() => changeQuantity(line.id, line.quantity + 1)}
                            type="button"
                          ><Icon name="plus" /></button>
                        </div>
                      </div>
                      <div className="cart-line-price">
                        <span>{formatPrice(Number(line.variant.price.amount) * line.quantity, currency)}</span>
                        <button
                          aria-label={`Remove ${line.product.title} from bag`}
                          className="remove-link"
                          disabled={updating}
                          onClick={() => void updateCart({ action: "remove", lineId: line.id })}
                          type="button"
                        >Remove</button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="cart-summary">
                <div className="subtotal-row"><span>Subtotal</span><strong>{formatPrice(subtotal, currency)}</strong></div>
                <p>Shipping and taxes calculated at checkout.</p>
                {checkoutError && <p className="chat-error" role="alert">{checkoutError}</p>}
                <button className="checkout-button" disabled={checkingOut || loading || updating || !cartId} onClick={() => void startCheckout()} type="button">
                  {checkingOut ? "Preparing checkout…" : <>Continue to checkout <Icon name="arrow" /></>}
                </button>
                <button className="continue-shopping" onClick={close} type="button">Continue shopping</button>
              </div>
            </>
          )}
        </aside>
      </div>
    );
  },
);
