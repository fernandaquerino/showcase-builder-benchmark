"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { RotateCcw, Save, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getDefaultLiveTheme,
  getLiveThemeCssVariables,
  getLiveThemePreset,
  LIVE_THEME_COLOR_SWATCHES,
  LIVE_THEME_PRESETS,
  liveThemeButtonStyles,
  liveThemeCardStyles,
  liveThemeFontPresets,
  liveThemeHeroStyles,
  liveThemePresetIds,
  mergeLiveThemeWithPreset,
  stripLiveThemePresetMeta,
  validateThemeContrast,
  type LiveThemeButtonStyle,
  type LiveThemeCardStyle,
  type LiveThemeConfig,
  type LiveThemeFontPreset,
  type LiveThemeHeroStyle,
  type LiveThemePresetId,
} from "@/lib/live-theme";
import { cn } from "@/lib/utils";
import { updateAccountAppearanceAction } from "@/server/actions/account";
import type { Product } from "@/server/db/queries/products";

type LiveAppearanceSectionProps = {
  title?: string;
  coverImageUrl: string | null;
  initialTheme: LiveThemeConfig | null;
  products: Product[];
};

type PreviewDevice = "mobile" | "desktop";

const PREVIEW_UPDATE_DELAY_MS = 120;

const buttonLabels: Record<LiveThemeButtonStyle, string> = {
  rounded: "Arredondado",
  soft: "Suave",
  square: "Reto",
};

const cardLabels: Record<LiveThemeCardStyle, string> = {
  shadow: "Com sombra",
  border: "Com borda",
  flat: "Sem destaque",
};

const fontLabels: Record<LiveThemeFontPreset, string> = {
  modern: "Moderna",
  elegant: "Elegante",
  classic: "Clássica",
};

const heroLabels: Record<LiveThemeHeroStyle, string> = {
  image: "Imagem em destaque",
  overlay: "Imagem com texto sobreposto",
  clean: "Visual limpo",
};

const loadedPreviewFonts = new Set<string>();

/**
 * Keeps the preview heading on a font that is already available, so switching
 * typography doesn't flash the fallback font while the new one loads.
 */
function usePreviewHeadingFont(fontFamily: string): string {
  const [headingFont, setHeadingFont] = useState(fontFamily);

  useEffect(() => {
    if (loadedPreviewFonts.has(fontFamily)) {
      return;
    }

    let active = true;
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    const loading = fonts
      ? fonts.load(`600 1em ${fontFamily}`).catch(() => [])
      : Promise.resolve([]);

    void loading.then(() => {
      loadedPreviewFonts.add(fontFamily);
      if (active) {
        setHeadingFont(fontFamily);
      }
    });

    return () => {
      active = false;
    };
  }, [fontFamily]);

  return headingFont;
}

function OptionButton<T extends string>({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: T;
  selected: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40",
      )}
      onClick={() => onSelect(value)}
    >
      {label}
    </button>
  );
}

function ThemePreview({
  theme,
  title,
  coverImageUrl,
  products,
  device,
}: {
  theme: LiveThemeConfig;
  title: string;
  coverImageUrl: string | null;
  products: Product[];
  device: PreviewDevice;
}) {
  const variables = getLiveThemeCssVariables(theme);
  const headingFont = usePreviewHeadingFont(variables["--live-font-family"]);
  const sampleProducts =
    products.length > 0
      ? products.slice(0, 2)
      : [
          {
            id: "preview-1",
            name: "Blazer alfaiataria",
            category: "Looks",
            price: "229.90",
            imageUrl: "",
            productUrl: "#",
            size: "M",
            color: "Ameixa",
          },
          {
            id: "preview-2",
            name: "Vestido midi",
            category: "Vestidos",
            price: "189.90",
            imageUrl: "",
            productUrl: "#",
            size: "P",
            color: "Preto",
          },
        ];

  return (
    <div
      aria-label="Prévia visual da página da live"
      className={cn(
        "mx-auto overflow-hidden border bg-[var(--live-background)] font-[family-name:var(--live-font-family)] text-[var(--live-foreground)] shadow-sm",
        device === "mobile" ? "max-w-[360px] rounded-[2rem]" : "w-full rounded-2xl",
      )}
      style={variables as CSSProperties}
    >
      <div
        className={cn(
          "relative min-h-48 overflow-hidden p-5",
          theme.heroStyle === "clean" && "bg-[var(--live-card)]",
        )}
      >
        {coverImageUrl && theme.heroStyle !== "clean" ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-black/45" />
          </>
        ) : null}
        <div className="relative space-y-3">
          <span className="inline-flex rounded-full bg-[var(--live-primary)] px-3 py-1 text-xs font-semibold text-[var(--live-primary-foreground)]">
            Live agendada
          </span>
          <h3
            className="max-w-sm text-3xl font-semibold leading-tight"
            style={{ fontFamily: headingFont }}
          >
            {title || "Minha live especial"}
          </h3>
          <p className="text-sm opacity-75">02 dias · 04 horas · 18 min</p>
          <a
            href="#"
            aria-disabled="true"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--live-radius)] bg-[var(--live-primary)] px-5 text-sm font-semibold text-[var(--live-primary-foreground)]"
            onClick={(event) => event.preventDefault()}
          >
            Ver produtos
          </a>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex gap-2 overflow-hidden">
          {["Tudo", "Looks", "Vestidos"].map((item, index) => (
            <span
              key={item}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold",
                index === 0
                  ? "border-[var(--live-primary)] bg-[var(--live-primary)] text-[var(--live-primary-foreground)]"
                  : "border-[var(--live-border)] bg-[var(--live-card)]",
              )}
            >
              {item}
            </span>
          ))}
        </div>

        <div className={cn("grid gap-3", device === "mobile" ? "grid-cols-2" : "grid-cols-4")}>
          {sampleProducts.map((product) => (
            <article
              key={product.id}
              className={cn(
                "overflow-hidden bg-[var(--live-card)] text-[var(--live-card-foreground)]",
                theme.cardStyle === "shadow" && "shadow-md",
                theme.cardStyle === "border" && "border border-[var(--live-border)]",
                theme.cardStyle === "flat" && "border border-transparent",
              )}
              style={{ borderRadius: "var(--live-radius)" }}
            >
              <div className="aspect-[3/4] bg-[var(--live-muted)]">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : null}
              </div>
              <div className="space-y-2 p-3">
                <p className="text-[0.7rem] font-semibold text-[var(--live-primary)]">
                  {product.category}
                </p>
                <p className="line-clamp-2 text-xs font-semibold">
                  {product.name}
                </p>
                <p className="text-xs opacity-70">
                  {[product.size && `Tam. ${product.size}`, product.color]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="font-semibold">R$ {product.price ?? "149,90"}</p>
                <span className="flex min-h-10 items-center justify-center rounded-[var(--live-radius)] bg-[var(--live-primary)] px-3 text-xs font-semibold text-[var(--live-primary-foreground)]">
                  Ver produto
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-[var(--live-radius)] bg-[var(--live-card)] p-4">
          <p className="font-semibold">Gostou das escolhas?</p>
          <p className="text-sm opacity-70">Compartilhe esta vitrine.</p>
        </div>
      </div>
    </div>
  );
}

export function LiveAppearanceSection({
  title = "Minha vitrine",
  coverImageUrl,
  initialTheme,
  products,
}: LiveAppearanceSectionProps) {
  const [theme, setTheme] = useState<LiveThemeConfig>(
    mergeLiveThemeWithPreset(initialTheme),
  );
  const [savedTheme, setSavedTheme] = useState<LiveThemeConfig>(
    mergeLiveThemeWithPreset(initialTheme),
  );
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const [isPending, startTransition] = useTransition();

  // The native color picker fires a change on every drag step; debounce the
  // preview so the controls stay responsive while the page re-renders.
  const [previewTheme, setPreviewTheme] = useState<LiveThemeConfig>(theme);
  const [schedulePreview] = useState(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    function schedule(next: Partial<LiveThemeConfig>) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setPreviewTheme(mergeLiveThemeWithPreset({ ...theme, ...next }));
      }, PREVIEW_UPDATE_DELAY_MS);
    }

    schedule.cancel = () => clearTimeout(timeout);
    return schedule;
  });

  useEffect(() => schedulePreview.cancel, [schedulePreview]);

  const contrast = useMemo(() => validateThemeContrast(theme), [theme]);
  const isDirty = JSON.stringify(theme) !== JSON.stringify(savedTheme);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function updateTheme(next: Partial<LiveThemeConfig>) {
    setTheme((current) => mergeLiveThemeWithPreset({ ...current, ...next }));
    schedulePreview(next);
  }

  function replaceTheme(nextTheme: LiveThemeConfig) {
    setTheme(nextTheme);
    schedulePreview(nextTheme);
  }

  function applyPreset(preset: LiveThemePresetId) {
    replaceTheme(stripLiveThemePresetMeta(getLiveThemePreset(preset)));
  }

  function saveTheme(nextTheme = theme) {
    startTransition(async () => {
      const result = await updateAccountAppearanceAction(nextTheme);
      if (result.success) {
        setSavedTheme(nextTheme);
        replaceTheme(nextTheme);
        toast.success("A aparência da vitrine foi atualizada.");
        return;
      }

      toast.error(result.message);
    });
  }

  function resetTheme() {
    if (
      !window.confirm(
        "Restaurar o tema padrão?\n\nSuas escolhas de cores e estilos serão removidas.",
      )
    ) {
      return;
    }

    const defaultTheme = getDefaultLiveTheme();
    startTransition(async () => {
      const result = await updateAccountAppearanceAction(null);
      if (result.success) {
        replaceTheme(defaultTheme);
        setSavedTheme(defaultTheme);
        toast.success("Tema padrão restaurado.");
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <section className="space-y-6" aria-labelledby="appearance-heading">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="appearance-heading" className="text-xl font-semibold">
              Aparência da vitrine
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha o visual usado em todas as suas páginas públicas.
            </p>
          </div>
          {isDirty ? (
            <span className="rounded-full bg-warning/15 px-3 py-1 text-sm font-medium text-warning-foreground">
              Alterações não salvas
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="font-medium">Estilo pronto</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {liveThemePresetIds.map((presetId) => {
                const preset = LIVE_THEME_PRESETS[presetId];
                return (
                  <button
                    key={presetId}
                    type="button"
                    aria-pressed={theme.preset === presetId}
                    className={cn(
                      "min-h-24 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20",
                      theme.preset === presetId
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                    onClick={() => applyPreset(presetId)}
                  >
                    <span className="font-semibold">{preset.name}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-medium">Cores</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Cor principal</span>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    defaultValue={theme.primaryColor}
                    aria-label="Selecionar cor principal"
                    className="h-11 w-14 p-1"
                    onChange={(event) =>
                      updateTheme({ primaryColor: event.target.value.toUpperCase() })
                    }
                  />
                  <Input
                    value={theme.primaryColor}
                    aria-label="Hexadecimal da cor principal"
                    onChange={(event) =>
                      updateTheme({ primaryColor: event.target.value })
                    }
                  />
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Cor de fundo</span>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    defaultValue={theme.backgroundColor}
                    aria-label="Selecionar cor de fundo"
                    className="h-11 w-14 p-1"
                    onChange={(event) =>
                      updateTheme({
                        backgroundColor: event.target.value.toUpperCase(),
                      })
                    }
                  />
                  <Input
                    value={theme.backgroundColor}
                    aria-label="Hexadecimal da cor de fundo"
                    onChange={(event) =>
                      updateTheme({ backgroundColor: event.target.value })
                    }
                  />
                </div>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {LIVE_THEME_COLOR_SWATCHES.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className="flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
                  onClick={() => updateTheme({ primaryColor: color.value })}
                >
                  <span
                    className="size-5 rounded-full border"
                    style={{ backgroundColor: color.value }}
                    aria-hidden="true"
                  />
                  {color.name}
                </button>
              ))}
            </div>

            {contrast.warnings.length > 0 ? (
              <div
                className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm"
                aria-live="polite"
              >
                <p className="font-medium">Esta combinação pode ficar difícil de ler.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => replaceTheme(contrast.recommended)}
                >
                  Usar combinação recomendada
                </Button>
              </div>
            ) : null}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-medium">Botões</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {liveThemeButtonStyles.map((style) => (
                <OptionButton
                  key={style}
                  label={buttonLabels[style]}
                  value={style}
                  selected={theme.buttonStyle === style}
                  onSelect={(buttonStyle) => updateTheme({ buttonStyle })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-medium">Cards de produto</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {liveThemeCardStyles.map((style) => (
                <OptionButton
                  key={style}
                  label={cardLabels[style]}
                  value={style}
                  selected={theme.cardStyle === style}
                  onSelect={(cardStyle) => updateTheme({ cardStyle })}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-medium">Tipografia</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {liveThemeFontPresets.map((fontPreset) => (
                <OptionButton
                  key={fontPreset}
                  label={fontLabels[fontPreset]}
                  value={fontPreset}
                  selected={theme.fontPreset === fontPreset}
                  onSelect={(nextFontPreset) =>
                    updateTheme({ fontPreset: nextFontPreset })
                  }
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-medium">Hero</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {liveThemeHeroStyles.map((heroStyle) => (
                <OptionButton
                  key={heroStyle}
                  label={heroLabels[heroStyle]}
                  value={heroStyle}
                  selected={theme.heroStyle === heroStyle}
                  onSelect={(nextHeroStyle) =>
                    updateTheme({ heroStyle: nextHeroStyle })
                  }
                />
              ))}
            </div>
          </fieldset>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={() => saveTheme()}
              loading={isPending}
              disabled={!isDirty || !contrast.valid}
              fullWidth
              className="min-w-0"
            >
              <Save className="size-4" aria-hidden="true" />
              Salvar aparência
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetTheme}
              disabled={isPending}
              fullWidth
              className="min-w-0"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Restaurar tema padrão
            </Button>
          </div>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Prévia da página</h3>
            <div className="inline-flex rounded-xl border bg-card p-1">
              <Button
                type="button"
                variant={device === "mobile" ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label="Prévia em celular"
                onClick={() => setDevice("mobile")}
              >
                <Smartphone className="size-4" aria-hidden="true" />
              </Button>
              {/* <Button
                type="button"
                variant={device === "desktop" ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label="Prévia em computador"
                onClick={() => setDevice("desktop")}
              >
                <Monitor className="size-4" aria-hidden="true" />
              </Button> */}
            </div>
          </div>
          <ThemePreview
            theme={previewTheme}
            title={title}
            coverImageUrl={coverImageUrl}
            products={products}
            device={device}
          />
        </aside>
      </div>
    </section>
  );
}
