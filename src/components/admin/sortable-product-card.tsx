"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { DeleteProductDialog } from "@/components/admin/delete-product-dialog";
import { ProductImage } from "@/components/admin/product-image";
import { Button } from "@/components/ui/button";
import { formatBrlPrice } from "@/lib/price";
import { cn } from "@/lib/utils";

export type ProductCardData = {
  id: string;
  name: string;
  category: string;
  size: string | null;
  color: string | null;
  imageUrl: string;
  price: string | null;
};

type SortableProductCardProps = {
  liveId: string;
  product: ProductCardData;
  position: number;
  total: number;
  disabled: boolean;
  imageBroken: boolean;
  onImageError: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function SortableProductCard({
  liveId,
  product,
  position,
  total,
  disabled,
  imageBroken,
  onImageError,
  onMoveUp,
  onMoveDown,
}: SortableProductCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const price = formatBrlPrice(product.price);
  const details = [product.size, product.color].filter(Boolean).join(" · ");
  const canMoveUp = position > 1;
  const canMoveDown = position < total;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-card p-3 sm:p-4",
        isDragging && "z-10 opacity-80 shadow-lg ring-2 ring-primary/40",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="flex size-11 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 active:cursor-grabbing"
        aria-label={`Reordenar ${product.name}. Use espaço para começar a mover e as setas para alterar a posição.`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" aria-hidden="true" />
      </button>

      <ProductImage
        src={imageBroken ? null : product.imageUrl}
        alt={`Foto de ${product.name}`}
        className="size-16 shrink-0 sm:size-20"
        onError={onImageError}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
            {position}
          </span>
          <p className="truncate font-medium">{product.name}</p>
        </div>
        <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {product.category}
        </p>
        {details && (
          <p className="mt-0.5 text-sm text-muted-foreground">{details}</p>
        )}
        {price && <p className="mt-1 text-sm font-semibold">{price}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-1">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/lives/${liveId}/products/${product.id}`}>
              <Pencil className="size-4" aria-hidden="true" />
              Editar
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={disabled || !canMoveUp}
            aria-label={`Mover ${product.name} para cima`}
          >
            <ChevronUp className="size-5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={disabled || !canMoveDown}
            aria-label={`Mover ${product.name} para baixo`}
          >
            <ChevronDown className="size-5" aria-hidden="true" />
          </Button>
          <DeleteProductDialog
            liveId={liveId}
            productId={product.id}
            name={product.name}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto text-muted-foreground hover:text-destructive"
                aria-label={`Excluir ${product.name}`}
              >
                <Trash2 className="size-5" aria-hidden="true" />
              </Button>
            }
          />
        </div>
      </div>
    </li>
  );
}
