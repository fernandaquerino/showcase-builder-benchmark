"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  SortableProductCard,
  type ProductCardData,
} from "@/components/admin/sortable-product-card";
import type { ActionResult } from "@/server/actions/action-result";
import {
  moveProductDownAction,
  moveProductToAction,
  moveProductUpAction,
} from "@/server/actions/products";

type OrderStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

function signature(items: ProductCardData[]): string {
  return items
    .map((item) => item.id)
    .sort()
    .join(",");
}

function formatPositions(positions: number[]): string {
  if (positions.length === 1) {
    return String(positions[0]);
  }

  return `${positions.slice(0, -1).join(", ")} e ${positions[positions.length - 1]}`;
}

export function ProductList({
  liveId,
  products,
}: {
  liveId: string;
  products: ProductCardData[];
}) {
  const [items, setItems] = useState(products);
  const [status, setStatus] = useState<OrderStatus>({ kind: "idle" });
  const [brokenImagePositions, setBrokenImagePositions] = useState<number[]>(
    [],
  );
  const [isPending, startTransition] = useTransition();

  // Re-sync with the server whenever products are added or removed (e.g. after
  // a delete or a bulk import). Reorders are already applied locally, so the
  // server response doesn't need to snap the list back into place.
  const propsSignature = signature(products);
  const lastSignature = useRef(propsSignature);
  useEffect(() => {
    if (lastSignature.current !== propsSignature) {
      lastSignature.current = propsSignature;
      setItems(products);
      setStatus({ kind: "idle" });
    }
  }, [propsSignature, products]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function reportBrokenImage(position: number) {
    setBrokenImagePositions((current) =>
      current.includes(position)
        ? current
        : [...current, position].sort((a, b) => a - b),
    );
  }

  function persistOrder(
    nextItems: ProductCardData[],
    previous: ProductCardData[],
    save: () => Promise<ActionResult>,
  ) {
    setItems(nextItems);
    setStatus({ kind: "saving" });

    startTransition(async () => {
      const result = await save();

      if (!result.success) {
        setItems(previous);
        setStatus({ kind: "error", message: result.message });
        return;
      }

      lastSignature.current = signature(nextItems);
      setStatus({ kind: "saved" });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    persistOrder(arrayMove(items, oldIndex, newIndex), items, () =>
      moveProductToAction(liveId, String(active.id), String(over.id)),
    );
  }

  function move(productId: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === productId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= items.length) {
      return;
    }

    persistOrder(arrayMove(items, index, target), items, () =>
      direction === -1
        ? moveProductUpAction(liveId, productId)
        : moveProductDownAction(liveId, productId),
    );
  }

  return (
    <div className="space-y-3">
      <p
        className="min-h-5 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {status.kind === "saving" && "Salvando nova ordem..."}
        {status.kind === "saved" && "Ordem atualizada"}
        {status.kind === "error" && (
          <span className="text-destructive">{status.message}</span>
        )}
      </p>

      {brokenImagePositions.length > 0 && (
        <p className="text-sm text-destructive" aria-live="polite">
          {brokenImagePositions.length === 1
            ? `A imagem do produto na posição ${formatPositions(brokenImagePositions)} não carregou.`
            : `As imagens dos produtos nas posições ${formatPositions(brokenImagePositions)} não carregaram.`}{" "}
          Edite o produto para trocar a imagem.
        </p>
      )}

      <DndContext
        id={`products-${liveId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-3">
            {items.map((product, index) => (
              <SortableProductCard
                key={product.id}
                liveId={liveId}
                product={product}
                position={index + 1}
                total={items.length}
                disabled={isPending}
                imageBroken={brokenImagePositions.includes(index + 1)}
                onImageError={() => reportBrokenImage(index + 1)}
                onMoveUp={() => move(product.id, -1)}
                onMoveDown={() => move(product.id, 1)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
