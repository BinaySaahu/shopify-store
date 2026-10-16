"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { CartDrawer, type CartDrawerHandle } from "@/components/cart-drawer";
import { Icon } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";
import type { Product } from "@/types/store";

type ProductPageProps = {
  product: Product;
};

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function ProductPage({ product }: ProductPageProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants.find((variant) => variant.availableForSale)?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);
  const [itemCount, setItemCount] = useState(0);
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [cartReady, setCartReady] = useState(false);
  const cartDrawerRef = useRef<CartDrawerHandle>(null);

  const handleItemCountChange = useCallback((count: number) => {
    setItemCount(count);
  }, []);
  const handleCartReadyChange = useCallback((ready: boolean) => {
    setCartReady(ready);
  }, []);
  const handleVariantQuantitiesChange = useCallback(
    (quantities: Record<string, number>) => {
      setCartQuantities(quantities);
    },
    [],
  );

  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants.find((variant) => variant.availableForSale);
  const image = product.images[selectedImage];
  const selectedVariantQuantity = selectedVariant
    ? cartQuantities[selectedVariant.id] ?? 0
    : 0;

  return (
    <>
      <SiteHeader
        itemCount={itemCount}
        onOpenCart={() => cartDrawerRef.current?.open()}
      />
      <main className="product-detail-page">
        <nav aria-label="Breadcrumb" className="product-breadcrumb">
          <Link href="/#shop">Shop all</Link>
          <span aria-hidden="true">/</span>
          <span>{product.title}</span>
        </nav>

        <section aria-labelledby="product-title" className="product-detail">
          <div className="product-gallery">
            <div
              aria-label={image?.altText || product.title}
              className={`product-main-image${image ? "" : " product-image-placeholder"}`}
              role="img"
              style={image ? { backgroundImage: `url("${image.url}")` } : undefined}
            />
            {product.images.length > 1 && (
              <div aria-label="Product images" className="product-thumbnails">
                {product.images.map((productImage, index) => (
                  <button
                    aria-label={`Show image ${index + 1} of ${product.title}`}
                    aria-pressed={index === selectedImage}
                    className={`product-thumbnail${index === selectedImage ? " is-selected" : ""}`}
                    key={productImage.url}
                    onClick={() => setSelectedImage(index)}
                    style={{ backgroundImage: `url("${productImage.url}")` }}
                    type="button"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="product-detail-info">
            {product.productType && <span className="eyebrow">{product.productType}</span>}
            <h1 id="product-title">{product.title}</h1>
            <p className="product-detail-price">
              {formatPrice(
                selectedVariant?.price.amount ?? product.priceRange.minVariantPrice.amount,
                selectedVariant?.price.currencyCode ?? product.priceRange.minVariantPrice.currencyCode,
              )}
            </p>
            <p className="product-detail-description">
              {product.description || "Thoughtfully made for everyday rituals."}
            </p>

            {product.variants.length > 1 && (
              <label className="product-variant-field">
                <span>Choose an option</span>
                <select
                  disabled={!product.variants.some((variant) => variant.availableForSale)}
                  onChange={(event) => setSelectedVariantId(event.target.value)}
                  value={selectedVariantId}
                >
                  {product.variants.map((variant) => (
                    <option
                      disabled={!variant.availableForSale}
                      key={variant.id}
                      value={variant.id}
                    >
                      {variant.title}{variant.availableForSale ? "" : " — Sold out"}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {selectedVariant ? selectedVariantQuantity > 0 ? (
              <div className="product-purchase-row">
                <div
                  aria-label={`${product.title} quantity in bag`}
                  className="product-quantity"
                >
                  <button
                    aria-label="Decrease quantity"
                    disabled={!cartReady}
                    onClick={() =>
                      cartDrawerRef.current?.setVariantQuantity(
                        selectedVariant.id,
                        selectedVariantQuantity - 1,
                      )
                    }
                    type="button"
                  >
                    <Icon name="minus" />
                  </button>
                  <span>{selectedVariantQuantity}</span>
                  <button
                    aria-label="Increase quantity"
                    disabled={!cartReady || selectedVariantQuantity >= 99}
                    onClick={() =>
                      cartDrawerRef.current?.setVariantQuantity(
                        selectedVariant.id,
                        selectedVariantQuantity + 1,
                      )
                    }
                    type="button"
                  >
                    <Icon name="plus" />
                  </button>
                </div>
                <span className="product-added-label">In your bag</span>
              </div>
            ) : (
              <div className="product-purchase-row">
                <div aria-label="Quantity" className="product-quantity">
                  <button
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    <Icon name="minus" />
                  </button>
                  <span>{quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    disabled={quantity >= 99}
                    onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                    type="button"
                  >
                    <Icon name="plus" />
                  </button>
                </div>
                <button
                  className="product-add-button"
                  disabled={!cartReady}
                  onClick={() => cartDrawerRef.current?.add(selectedVariant, quantity)}
                  type="button"
                >
                  Add to bag
                  <Icon name="arrow" />
                </button>
              </div>
            ) : (
              <p className="product-sold-out">This product is currently unavailable.</p>
            )}
            <p className="product-shipping-note">Shipping and taxes calculated at checkout.</p>
          </div>
        </section>
        <div className="product-back-link">
          <Link href="/#shop">← Back to the collection</Link>
        </div>
      </main>
      <CartDrawer
        onItemCountChange={handleItemCountChange}
        onReadyChange={handleCartReadyChange}
        onVariantQuantitiesChange={handleVariantQuantitiesChange}
        ref={cartDrawerRef}
      />
    </>
  );
}
