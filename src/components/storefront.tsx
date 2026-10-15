"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CartDrawer, type CartDrawerHandle } from "@/components/cart-drawer";
import { ChatAssistant } from "@/components/chat-assistant";
import { Icon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import type { Product } from "@/types/store";

type ProductResult = { products?: Product[]; error?: string };

export function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All products");
  const [sort, setSort] = useState("featured");
  const [cartReady, setCartReady] = useState(false);
  const cartDrawerRef = useRef<CartDrawerHandle>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/products");
      const result = (await response.json()) as ProductResult;
      if (!response.ok || !result.products) {
        throw new Error(result.error || "We couldn’t load the collection. Please try again.");
      }
      setProducts(result.products);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t load the collection. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  function retryLoadProducts() {
    setLoading(true);
    setError("");
    void loadProducts();
  }

  useEffect(() => {
    void Promise.resolve().then(loadProducts);
  }, [loadProducts]);

  const handleCartItemCountChange = useCallback((count: number) => {
    setItemCount(count);
  }, []);
  const handleCartReadyChange = useCallback((ready: boolean) => {
    setCartReady(ready);
  }, []);

  const categories = useMemo(
    () => ["All products", ...new Set(products.map((product) => product.productType).filter(Boolean))],
    [products],
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        `${product.title} ${product.description} ${product.productType}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCategory = category === "All products" || product.productType === category;
      return matchesQuery && matchesCategory;
    });
    if (sort === "price-low") {
      return [...result].sort(
        (a, b) =>
          Number(a.priceRange.minVariantPrice.amount) -
          Number(b.priceRange.minVariantPrice.amount),
      );
    }
    if (sort === "price-high") {
      return [...result].sort(
        (a, b) =>
          Number(b.priceRange.minVariantPrice.amount) -
          Number(a.priceRange.minVariantPrice.amount),
      );
    }
    return result;
  }, [category, products, query, sort]);

  return (
    <>
      <SiteHeader itemCount={itemCount} onOpenCart={() => cartDrawerRef.current?.open()} />
      <main>
        <section className="hero" id="about">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-rule" /> A MORE CONSIDERED EVERYDAY</span>
            <h1>Good things,<br /><em>well chosen.</em></h1>
            <p>Thoughtfully made essentials for the little moments that make a day.</p>
            <a className="hero-link" href="#shop">Explore the collection <Icon name="arrow" /></a>
          </div>
          <div aria-hidden="true" className="hero-art">
            <div className="hero-circle hero-circle-one" />
            <div className="hero-circle hero-circle-two" />
            <div className="hero-leaf leaf-one" />
            <div className="hero-leaf leaf-two" />
            <div className="hero-leaf leaf-three" />
            <span className="hero-art-caption">A softer kind<br />of everyday</span>
            <span className="hero-art-index">01 / 03</span>
          </div>
          <div className="hero-bottom">
            <span>DESIGNED FOR DAILY LIFE</span>
            <span>MADE WITH INTENTION</span>
            <span>ALWAYS A LITTLE BETTER</span>
          </div>
        </section>

        <section className="shop-section" id="shop">
          <div className="shop-heading">
            <div>
              <span className="eyebrow"><span className="eyebrow-rule" /> THE COLLECTION</span>
              <h2>Find your <em>everyday.</em></h2>
            </div>
            <p>Considered pieces, chosen to make the everyday feel a little more special.</p>
          </div>

          <div className="shop-layout">
            <div className="catalog">
              <div className="catalog-controls">
                <label className="search-box">
                  <Icon name="search" />
                  <span className="sr-only">Search products</span>
                  <input
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search the collection"
                    value={query}
                  />
                </label>
                <label className="filter-select">
                  <span className="sr-only">Filter products by category</span>
                  <select onChange={(event) => setCategory(event.target.value)} value={category}>
                    {categories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="filter-select sort-select">
                  <span className="sr-only">Sort products</span>
                  <select onChange={(event) => setSort(event.target.value)} value={sort}>
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                  </select>
                </label>
              </div>

              {loading ? (
                <div aria-label="Loading products" className="product-grid loading-grid">
                  {Array.from({ length: 4 }, (_, index) => <div className="product-skeleton" key={index} />)}
                </div>
              ) : error ? (
                <div className="catalog-state" role="alert">
                  <span className="state-icon">!</span>
                  <h3>We can’t reach the collection right now.</h3>
                  <p>{error}</p>
                  <button className="outline-button" onClick={retryLoadProducts} type="button">Try again</button>
                </div>
              ) : visibleProducts.length ? (
                <>
                  <div className="result-count">{visibleProducts.length} considered {visibleProducts.length === 1 ? "piece" : "pieces"}</div>
                  <div className="product-grid">
                    {visibleProducts.map((product) => (
                      <ProductCard
                        addDisabled={!cartReady}
                        key={product.id}
                        onAdd={(_product, variant) => cartDrawerRef.current?.add(variant)}
                        product={product}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="catalog-state">
                  <span className="state-icon"><Icon name="search" /></span>
                  <h3>Nothing found this time.</h3>
                  <p>Try another search or browse the full collection.</p>
                  <button className="outline-button" onClick={() => { setQuery(""); setCategory("All products"); }} type="button">Clear filters</button>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <a aria-label="Innovist home" className="wordmark" href="#">innovist<span>.</span></a>
          <p>Everyday, a little more considered.</p>
          <span>© {new Date().getFullYear()} INNOVIST</span>
        </footer>
      </main>
      <CartDrawer
        onItemCountChange={handleCartItemCountChange}
        onReadyChange={handleCartReadyChange}
        ref={cartDrawerRef}
      />
      <ChatAssistant
        addDisabled={!cartReady}
        onAddToCart={(_product, variant) => cartDrawerRef.current?.add(variant)}
        products={products}
      />
    </>
  );
}
