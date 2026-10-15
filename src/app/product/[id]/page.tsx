import { notFound } from "next/navigation";
import { ProductPage } from "@/components/product-page";
import { getProduct } from "@/lib/shopify";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return <ProductPage product={product} />;
}
