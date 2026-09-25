"use client";

import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

type ProductImageProps = {
  src: string | null;
  alt: string;
  className?: string;
  onError?: () => void;
};

/**
 * Renders an externally-hosted product image for the admin area.
 *
 * Product image URLs are arbitrary (pasted by the creator), so we deliberately
 * use a plain `<img>` instead of `next/image`: it avoids configuring an
 * unrestricted remote-image wildcard and the optimizer proxy (a potential SSRF
 * vector) for untrusted hosts. This is an administrative preview only; the
 * public card and optimized images come in a later phase. A fixed-size box
 * prevents layout shift and an `onError` fallback keeps the card intact.
 */
export function ProductImage({ src, alt, className, onError }: ProductImageProps) {
  return (
    <div
      className={cn(
        "group flex items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- untrusted external host; see component doc.
        <img
          src={src}
          alt={alt}
          className="size-full object-cover data-[state=error]:hidden"
          loading="lazy"
          onError={(event) => {
            // Toggle the fallback with CSS instead of state, so a broken image
            // in a long list doesn't re-render its whole card.
            event.currentTarget.dataset.state = "error";
            onError?.();
          }}
        />
      ) : null}
      <span
        className={cn(
          "flex-col items-center gap-1 px-2 text-center text-xs",
          src ? "hidden group-has-[img[data-state=error]]:flex" : "flex",
        )}
      >
        <ImageOff className="size-5" aria-hidden="true" />
        <span>Não foi possível carregar esta imagem.</span>
      </span>
    </div>
  );
}
