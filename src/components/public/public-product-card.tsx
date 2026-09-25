"use client";

import { ImageOff, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LiveThemeConfig } from "@/lib/live-theme";
import { formatBrlPrice } from "@/lib/price";
import { cn } from "@/lib/utils";
import type { PublicProduct } from "@/server/db/queries/public-showcase";

type PublicProductCardProps = {
  product: PublicProduct;
  theme: LiveThemeConfig;
  priority?: boolean;
  titleHeight?: number | null;
};

export function PublicProductCard({
  product,
  theme,
  priority = false,
  titleHeight = null,
}: PublicProductCardProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = failedSrc === product.imageUrl;
  const price = formatBrlPrice(product.price);

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden bg-[var(--live-card)] text-[var(--live-card-foreground)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0",
        theme.cardStyle === "shadow" && "shadow-sm ring-1 ring-[var(--live-border)] hover:shadow-md",
        theme.cardStyle === "border" && "border border-[var(--live-border)]",
        theme.cardStyle === "flat" && "border border-transparent",
      )}
      style={{ borderRadius: "var(--live-radius)" }}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--live-muted)]">
        {showFallback ? (
          <div className="flex size-full flex-col items-center justify-center gap-2 px-3 text-center text-xs text-[var(--live-muted-foreground)]">
            <ImageOff className="size-6" aria-hidden="true" />
            <span>Imagem indisponível</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- product URLs are creator-provided external images; no optimizer wildcard.
          <img
            src={product.imageUrl}
            alt={product.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            onError={() => setFailedSrc(product.imageUrl)}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <Badge
          variant="secondary"
          className="w-fit rounded-full bg-[var(--live-primary)] px-2.5 text-[var(--live-primary-foreground)]"
        >
          {product.category}
        </Badge>

        <div className="space-y-1">
          <h3
            data-product-title
            className="line-clamp-3 text-sm font-semibold leading-5 sm:text-base sm:leading-6"
            style={titleHeight ? { height: titleHeight } : undefined}
          >
            {product.name}
          </h3>
          {(product.size || product.color) && (
            <p className="text-xs leading-5 text-[var(--live-muted-foreground)]">
              {[product.size && `Tam. ${product.size}`, product.color]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        <div className="mt-auto space-y-3">
          {price && (
            <p className="text-lg font-semibold tracking-tight">
              {price}
            </p>
          )}
          <Button
            asChild
            size="sm"
            className="min-h-11 w-full rounded-[var(--live-radius)] bg-[var(--live-primary)] px-3 text-[var(--live-primary-foreground)] hover:bg-[color-mix(in_srgb,var(--live-primary)_90%,black)]"
          >
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              aria-label={`Ver produto ${product.name}`}
            >
              <ShoppingBag className="size-4" aria-hidden="true" />
              Ver produto
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
