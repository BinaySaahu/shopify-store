"use client";

import { Icon } from "@/components/icons";

type SiteHeaderProps = {
  itemCount: number;
  onOpenCart: () => void;
};

export function SiteHeader({ itemCount, onOpenCart }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a aria-label="Innovist home" className="wordmark" href="#">
        innovist<span>.</span>
      </a>
      <nav aria-label="Main navigation" className="header-nav">
        <a href="#shop">Shop all</a>
        <a href="#about">Our approach</a>
      </nav>
      <button
        aria-label={`Open shopping bag, ${itemCount} items`}
        className="bag-button"
        onClick={onOpenCart}
        type="button"
      >
        {/* <span className="bag-label">Your bag</span> */}
        <span className="bag-icon">
          <Icon name="bag" />
          <span className="bag-count">{itemCount}</span>
        </span>
      </button>
    </header>
  );
}
