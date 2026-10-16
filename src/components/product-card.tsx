"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import type { Product, ProductVariant } from "@/types/store";
import Link from "next/link";

type ProductCardProps = {
  product: Product;
  onAdd: (product: Product, variant: ProductVariant) => void;
  cartQuantities: Record<string, number>;
  onQuantityChange: (variant: ProductVariant, quantity: number) => void;
  addDisabled?: boolean;
};

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function ProductCard({
  product,
  onAdd,
  cartQuantities,
  onQuantityChange,
  addDisabled = false,
}: ProductCardProps) {
  const availableVariants = product.variants.filter(
    (variant) => variant.availableForSale,
  );
  const [variantId, setVariantId] = useState(availableVariants[0]?.id ?? "");
  const selectedVariant =
    availableVariants.find((variant) => variant.id === variantId) ??
    availableVariants[0];
  const quantity = selectedVariant ? cartQuantities[selectedVariant.id] ?? 0 : 0;
  const image = product.images[0];
  const isRange =
    product.priceRange.minVariantPrice.amount !==
    product.priceRange.maxVariantPrice.amount;

  return (
    <article className="product-card">
      <Link
        aria-label={`View ${product.title}`}
        className="product-detail-link"
        href={`/product/${encodeURIComponent(product.handle)}`}
      >
        <div
          aria-label={image?.altText || product.title}
          className={`product-image${image ? "" : " product-image-placeholder"}`}
          role="img"
          style={image ? { backgroundImage: `url("${image.url}")` } : undefined}
        >
          {!product.availableForSale && (
            <span className="sold-out-tag">Sold out</span>
          )}
          {product.productType && (
            <span className="product-type-tag">{product.productType}</span>
          )}
        </div>
      </Link>
      <div className="product-card-content">
        <div className="product-title-row">
          <h3>
            <Link
              className="product-title-link"
              href={`/product/${encodeURIComponent(product.handle)}`}
            >
              {product.title}
            </Link>
          </h3>
          <span className="product-price">
            {isRange && <span className="price-from">from </span>}
            {formatPrice(
              product.priceRange.minVariantPrice.amount,
              product.priceRange.minVariantPrice.currencyCode,
            )}
          </span>
        </div>
        <p className="product-description">{product.description}</p>
        <div className="product-card-actions">
          {availableVariants.length > 1 ? (
            <label className="variant-select-wrap">
              <span className="sr-only">
                Choose an option for {product.title}
              </span>
              <select
                aria-label={`Choose an option for ${product.title}`}
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
          ) : (
            <span className="variant-single">
              {selectedVariant?.title || "Unavailable"}
            </span>
          )}
          {quantity > 0 && selectedVariant ? (
            <div aria-label={`${product.title} quantity in bag`} className="product-card-quantity">
              <button
                aria-label={`Decrease ${product.title} quantity`}
                disabled={addDisabled}
                onClick={() => onQuantityChange(selectedVariant, quantity - 1)}
                type="button"
              >
                <Icon name="minus" />
              </button>
              <span>{quantity}</span>
              <button
                aria-label={`Increase ${product.title} quantity`}
                disabled={addDisabled || quantity >= 99}
                onClick={() => onQuantityChange(selectedVariant, quantity + 1)}
                type="button"
              >
                <Icon name="plus" />
              </button>
            </div>
          ) : (
            <button
              aria-label={`Add ${product.title} to bag`}
              className="add-button"
              disabled={!selectedVariant || addDisabled}
              onClick={() => selectedVariant && onAdd(product, selectedVariant)}
              type="button"
            >
              <Icon name="plus" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
