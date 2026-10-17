
import type { Product } from "@/types/store";

const PRODUCTS_QUERY = `
  query GetProducts {
    products(first: 20) {
      nodes {
        id
        title
        handle
        description
        productType
        availableForSale
        images(first: 10) {
          nodes {
            id
            url
            altText
          }
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 10) {
          nodes {
            id
            title
            availableForSale
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

type ShopifyResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function storefrontRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  revalidate?: number,
): Promise<T> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim();

  if (!domain || !token) {
    throw new Error(
      "Shopify is not configured. Check SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN."
    );
  }

  const normalizedDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  const options: RequestInit & { next?: { revalidate: number } } = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Shopify-Storefront-Private-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  };
  if (revalidate !== undefined) options.next = { revalidate };

  const response = await fetch(
    `https://${normalizedDomain}/api/2026-10/graphql.json`,
    options,
  );

  if (!response.ok) {
    throw new Error(`Shopify returned HTTP ${response.status}.`);
  }

  const result = (await response.json()) as ShopifyResponse<T>;

  if (result.errors?.length) {
    throw new Error(
      result.errors.map((error) => error.message).join("; ")
    );
  }

  if (!result.data) {
    throw new Error("Shopify returned an invalid response.");
  }

  return result.data;
}

export async function getProducts(): Promise<Product[]> {
  const result = await storefrontRequest<{
    products?: {
      nodes?: Array<{
        id: string;
        title: string;
        handle: string;
        description: string;
        productType: string;
        availableForSale: boolean;
        priceRange: Product["priceRange"];
        images: { nodes: Product["images"] };
        variants: { nodes: Product["variants"] };
      }>;
    };
  }>(PRODUCTS_QUERY, undefined, 300);
  const products = result.products?.nodes;

  if (!products) {
    throw new Error("Shopify returned an invalid products response.");
  }

  return products.map((product) => ({
    ...product,
    images: product.images.nodes,
    variants: product.variants.nodes,
  }));
}

type ShopifyProduct = Omit<Product, "images" | "variants"> & {
  images: { nodes: Product["images"] };
  variants: { nodes: Product["variants"] };
};

const PRODUCT_FIELDS = `
  id
  title
  handle
  description
  productType
  availableForSale
  images(first: 10) {
    nodes {
      id
      url
      altText
    }
  }
  priceRange {
    minVariantPrice {
      amount
      currencyCode
    }
    maxVariantPrice {
      amount
      currencyCode
    }
  }
  variants(first: 100) {
    nodes {
      id
      title
      availableForSale
      price {
        amount
        currencyCode
      }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) { ${PRODUCT_FIELDS} }
  }
`;

export async function getProduct(identifier: string): Promise<Product | null> {
  
  const result = await storefrontRequest<{ product: ShopifyProduct | null }>(
    PRODUCT_BY_HANDLE_QUERY,
    { handle: identifier },
    300,
  );
  const product = result.product;
  if (!product) return null;

  return {
    ...product,
    images: product.images.nodes,
    variants: product.variants.nodes,
  };
}
