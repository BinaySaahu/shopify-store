export type Money = {
  amount: string;
  currencyCode: string;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
};

export type Product = {
  id: string;
  title: string;
  handle: string;
  description: string;
  productType: string;
  availableForSale: boolean;
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  images: Array<{ url: string; altText: string | null }>;
  variants: ProductVariant[];
};

export type CartLine = {
  id: string;
  variant: ProductVariant;
  product: Pick<Product, "id" | "title" | "handle" | "images">;
  quantity: number;
};
