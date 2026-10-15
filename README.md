# Innovist storefront

A responsive headless Shopify storefront built with Next.js App Router and Tailwind CSS. Product data, cart creation, and the optional AI shopping assistant are handled through server-side route handlers; storefront tokens and AI keys are never sent to the browser.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set the Shopify store domain (for example, `your-store.myshopify.com`) and a Shopify **Storefront API** access token.
3. Set `OPENAI_API_KEY` to enable the product-aware shopping assistant. `OPENAI_MODEL` is optional and defaults to `gpt-4o-mini`.
4. Run `npm install`, then `npm run dev`.

The `.env*` files are ignored by Git. Do not put secret values in `NEXT_PUBLIC_*` variables.

## Features

- Shopify Storefront GraphQL products, images, price ranges, variants, and availability.
- Search, product-type filtering, and price sorting.
- Variant-aware cart with quantity controls, removal, item count, subtotal, and local browser persistence.
- Shopify cart creation and hosted checkout handoff.
- Optional AI shopping assistant. It receives a small, bounded list of product titles, descriptions, prices, and available variant names; customer cart details and Shopify credentials are not sent.
- Loading, empty, configuration, and service-error states.

If Shopify is not configured, the catalog displays a configuration error with a retry action. If the AI key is not configured, chat reports that the assistant is unavailable while the rest of the storefront remains usable.

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```
