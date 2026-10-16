"use client";

import { Icon } from "@/components/icons";
import Link from "next/link";

type SiteHeaderProps = {
  itemCount: number;
  onOpenCart: () => void;
};

export function SiteHeader({ itemCount, onOpenCart }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link aria-label="Care home" className="wordmark" href="/">
        care<span>.</span>
      </Link>
      <nav aria-label="Main navigation" className="header-nav">
        <Link href="/#shop">Shop all</Link>
        <Link href="/#about">Our approach</Link>
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
      </nav>
    </header>
  );
}
