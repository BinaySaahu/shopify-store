"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import type { Product, ProductVariant } from "@/types/store";

type ProductCardProps = {
  product: Product;
  onAdd: (product: Product, variant: ProductVariant) => void;
  addDisabled?: boolean;
};

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function ProductCard({ product, onAdd, addDisabled = false }: ProductCardProps) {
  const availableVariants = product.variants.filter((variant) => variant.availableForSale);
  const [variantId, setVariantId] = useState(availableVariants[0]?.id ?? "");
  const selectedVariant =
    availableVariants.find((variant) => variant.id === variantId) ??
    availableVariants[0];
  const image = product.images[0];
  const isRange =
    product.priceRange.minVariantPrice.amount !==
    product.priceRange.maxVariantPrice.amount;

  return (
    <article className="product-card">
      <div
        aria-label={image?.altText || product.title}
        className={`product-image${image ? "" : " product-image-placeholder"}`}
        role="img"
        style={image ? { backgroundImage: `url("${image.url}")` } : undefined}
      >
        {!product.availableForSale && <span className="sold-out-tag">Sold out</span>}
        {product.productType && <span className="product-type-tag">{product.productType}</span>}
      </div>
      <div className="product-card-content">
        <div className="product-title-row">
          <h3>{product.title}</h3>
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
              <span className="sr-only">Choose an option for {product.title}</span>
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
            <span className="variant-single">{selectedVariant?.title || "Unavailable"}</span>
          )}
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
        </div>
      </div>
    </article>
  );
}
