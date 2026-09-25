"use client";

import { Search } from "lucide-react";
import { useId, useLayoutEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_IMPORT_LINKS,
  PARSED_LINK_LABELS,
  parseProductLinks,
  type ParsedLink,
} from "@/lib/products/parse-links";

const PLACEHOLDER = `https://www.cea.com.br/produto-1/p?utm_campaign=
https://www.cea.com.br/produto-2/p?utm_campaign=
https://www.cea.com.br/produto-3/p?utm_campaign=`;

const STATUS_STYLES: Record<ParsedLink["status"], string> = {
  valid: "text-success",
  invalid: "text-destructive",
  "host-not-allowed": "text-destructive",
  duplicate: "text-muted-foreground",
  "already-added": "text-muted-foreground",
};

export type BulkProductLinksInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (links: ParsedLink[]) => void;
  allowedHosts: readonly string[];
  existingUrlKeys: readonly string[];
  disabled?: boolean;
};

export function BulkProductLinksInput({
  value,
  onChange,
  onSubmit,
  allowedHosts,
  existingUrlKeys,
  disabled = false,
}: BulkProductLinksInputProps) {
  const textareaId = useId();
  const helpId = useId();
  const counterId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow with the pasted links so the whole list stays visible without an
  // inner scrollbar.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  const parsed = useMemo(
    () => parseProductLinks(value, { allowedHosts, existingUrlKeys }),
    [value, allowedHosts, existingUrlKeys],
  );

  const fetchable = parsed.filter(
    (link) => link.status === "valid" || link.status === "already-added",
  );
  const overLimit = fetchable.length > MAX_IMPORT_LINKS;
  const problems = parsed.filter(
    (link) => link.status !== "valid" && link.status !== "already-added",
  );

  return (
    <section className="space-y-4 rounded-xl border bg-muted/30 p-4 sm:p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Cole os links dos produtos</h2>
        <p className="text-sm text-muted-foreground">
          Adicione um link de afiliado por linha. Vamos buscar as informações de
          todos para você.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={textareaId}>Links dos produtos</Label>
        <Textarea
          ref={textareaRef}
          id={textareaId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          disabled={disabled}
          aria-describedby={`${helpId} ${counterId}`}
          className="resize-none overflow-hidden font-mono text-sm"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p id={helpId} className="text-sm text-muted-foreground">
            Mantemos o link completo para suas seguidoras comprarem por ele.
          </p>
          <p
            id={counterId}
            aria-live="polite"
            className={overLimit ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}
          >
            {fetchable.length} de {MAX_IMPORT_LINKS} links
          </p>
        </div>
      </div>

      {problems.length > 0 && (
        <ul className="space-y-1 text-sm" aria-label="Links que serão ignorados">
          {problems.map((link) => (
            <li key={`${link.originalIndex}-${link.affiliateUrl}`} className="flex gap-2">
              <span className={`shrink-0 font-medium ${STATUS_STYLES[link.status]}`}>
                {PARSED_LINK_LABELS[link.status]}:
              </span>
              <span className="truncate text-muted-foreground">{link.affiliateUrl}</span>
            </li>
          ))}
        </ul>
      )}

      {overLimit && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Você pode buscar no máximo {MAX_IMPORT_LINKS} links por vez. Remova
          alguns links e tente de novo.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={() => onSubmit(fetchable)}
          disabled={disabled || fetchable.length === 0 || overLimit}
          className="min-h-11"
        >
          <Search className="size-4" aria-hidden="true" />
          Buscar produtos
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onChange("")}
          disabled={disabled || value.trim() === ""}
          className="min-h-11"
        >
          Limpar
        </Button>
      </div>
    </section>
  );
}
