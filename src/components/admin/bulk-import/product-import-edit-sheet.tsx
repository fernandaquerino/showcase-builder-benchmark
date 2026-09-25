"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseBrlPrice } from "@/lib/price";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  ImportItemPatch,
  ImportProductItem,
} from "@/lib/products/import-item";

export type ProductImportEditSheetProps = {
  item: ImportProductItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: ImportItemPatch) => void;
};

type Draft = {
  name: string;
  category: string;
  size: string;
  color: string;
  imageUrl: string;
};

function draftFromItem(item: ImportProductItem): Draft {
  return {
    name: item.name,
    category: item.category,
    size: item.size ?? "",
    color: item.color ?? "",
    imageUrl: item.imageUrl,
  };
}

/** Shows the canonical decimal ("129.90") as BR input ("129,90"). */
function priceInputFromItem(item: ImportProductItem): string {
  return item.price ? item.price.replace(".", ",") : "";
}

export function ProductImportEditSheet({
  item,
  open,
  onOpenChange,
  onSave,
}: ProductImportEditSheetProps) {
  const [draft, setDraft] = useState<Draft>(() =>
    item ? draftFromItem(item) : {
      name: "",
      category: "",
      size: "",
      color: "",
      imageUrl: "",
    },
  );
  // Start from the product's current values every time the sheet opens
  // (React's recommended "adjust state during render" pattern — no effect).
  const openedItemId = open && item ? item.id : null;
  const [draftItemId, setDraftItemId] = useState<string | null>(openedItemId);
  if (openedItemId !== draftItemId) {
    setDraftItemId(openedItemId);
    if (item && openedItemId) {
      setDraft(draftFromItem(item));
    }
  }

  // The price keeps the creator's own formatting while she types ("1.299,9")
  // instead of being re-derived from the canonical value.
  const [price, setPrice] = useState(() =>
    item ? priceInputFromItem(item) : "",
  );
  const [priceItemId, setPriceItemId] = useState<string | null>(
    item?.id ?? null,
  );
  if (item && item.id !== priceItemId) {
    setPriceItemId(item.id);
    setPrice(priceInputFromItem(item));
  }

  const returnFocusRef = useRef<HTMLElement | null>(null);

  const nameId = useId();
  const categoryId = useId();
  const sizeId = useId();
  const colorId = useId();
  const priceId = useId();
  const imageId = useId();

  function update<K extends keyof Draft>(key: K, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!item) {
      return;
    }
    // Keep item.price as a canonical decimal. Parse the BR input back; on
    // invalid input keep the previous value so a typo never wipes a good price.
    const parsedPrice = parseBrlPrice(price);
    const nextPrice =
      parsedPrice.kind === "valid"
        ? parsedPrice.value
        : parsedPrice.kind === "empty"
          ? null
          : item.price;

    onSave(item.id, {
      name: draft.name,
      category: draft.category,
      size: draft.size.trim() === "" ? null : draft.size,
      color: draft.color.trim() === "" ? null : draft.color,
      price: nextPrice,
      imageUrl: draft.imageUrl,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={() => {
          // Remember the card that opened the editor, so closing it takes the
          // creator back to the same product in the review grid.
          if (returnFocusRef.current === null) {
            returnFocusRef.current =
              document.activeElement?.closest<HTMLElement>(
                "[data-import-card]",
              ) ?? null;
          }
        }}
        onCloseAutoFocus={(event) => {
          const card = returnFocusRef.current;
          if (card?.isConnected) {
            event.preventDefault();
            card.focus();
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>Editar produto</SheetTitle>
          <SheetDescription>
            Ajuste apenas o que precisar. O link de afiliado é preservado.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Nome</Label>
            <Input
              id={nameId}
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={categoryId}>Categoria</Label>
            <Input
              id={categoryId}
              value={draft.category}
              onChange={(event) => update("category", event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={sizeId}>Tamanho usado na live</Label>
              <Input
                id={sizeId}
                value={draft.size}
                onChange={(event) => update("size", event.target.value)}
                placeholder="Ex.: M"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={colorId}>Cor</Label>
              <Input
                id={colorId}
                value={draft.color}
                onChange={(event) => update("color", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={priceId}>Preço</Label>
            <Input
              id={priceId}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="99,90"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={imageId}>Endereço da imagem</Label>
            <Input
              id={imageId}
              type="url"
              inputMode="url"
              value={draft.imageUrl}
              onChange={(event) => update("imageUrl", event.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Se a imagem não tiver vindo, cole o endereço de uma imagem pública.
            </p>
          </div>

          {item && (
            <div className="space-y-1.5">
              <Label>Link de afiliado</Label>
              <p className="truncate rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {item.affiliateUrl}
              </p>
            </div>
          )}
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="min-h-11"
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} className="min-h-11">
            Salvar alterações
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
