"use client";

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  COVER_IMAGE_ACCEPT,
  COVER_IMAGE_MESSAGES,
  validateCoverImageFile,
} from "@/lib/validations/cover-image";

export type LiveImageUploadProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Reports upload-in-progress so the form can block its submit. */
  onUploadingChange?: (uploading: boolean) => void;
  /** Reports a rejected file or a failed upload to the surrounding form. */
  onError?: (message: string) => void;
  disabled?: boolean;
  error?: string;
};

/**
 * Portrait covers (selfies, full-body looks) keep the top of the photo in view
 * when cropped into landscape or square frames; landscape covers stay centered.
 */
export function coverObjectPosition(image: HTMLImageElement): string {
  return image.naturalHeight > image.naturalWidth ? "50% 20%" : "50% 50%";
}

function isLoadedImage(node: HTMLImageElement | null): node is HTMLImageElement {
  return Boolean(node?.complete && node.naturalWidth > 0);
}

/** Small cover thumbnail used in the live summary. */
export function LiveCoverThumbnail({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [objectPosition, setObjectPosition] = useState<string | null>(null);

  function measure(image: HTMLImageElement) {
    if (objectPosition !== null) {
      return;
    }
    setObjectPosition(coverObjectPosition(image));
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin preview can render creator-provided URLs directly.
    <img
      ref={(node) => {
        if (isLoadedImage(node)) {
          measure(node);
        }
      }}
      src={src}
      alt=""
      className={className}
      style={objectPosition ? { objectPosition } : undefined}
      onLoad={(event) => measure(event.currentTarget)}
    />
  );
}

// Cover crops measured on the lives list, kept across navigations so the list
// doesn't jump when the creator comes back to it.
const listCoverPositions = new Map<string, string>();

/** Cover image of a live card in the lives list. */
export function LiveListCover({
  liveId,
  src,
  alt,
  className,
}: {
  liveId: string;
  src: string;
  alt: string;
  className?: string;
}) {
  const [objectPosition, setObjectPosition] = useState<string | null>(
    () => listCoverPositions.get(liveId) ?? null,
  );

  function measure(image: HTMLImageElement) {
    if (listCoverPositions.has(liveId)) {
      return;
    }
    const position = coverObjectPosition(image);
    listCoverPositions.set(liveId, position);
    setObjectPosition(position);
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob/external cover URL, no optimizer wildcard.
    <img
      ref={(node) => {
        if (isLoadedImage(node)) {
          measure(node);
        }
      }}
      src={src}
      alt={alt}
      className={className}
      style={objectPosition ? { objectPosition } : undefined}
      loading="lazy"
      onLoad={(event) => measure(event.currentTarget)}
    />
  );
}

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "success" }
  | { kind: "error"; message: string };

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/lives/cover", {
    method: "POST",
    body: formData,
  });
  const data = (await response.json().catch(() => null)) as
    | { success: true; url: string }
    | { success: false; message: string }
    | null;

  if (!response.ok || !data || !data.success) {
    throw new Error(data && !data.success ? data.message : COVER_IMAGE_MESSAGES.uploadFailed);
  }
  return data.url;
}

export function LiveImageUpload({
  value,
  onChange,
  onUploadingChange,
  onError,
  disabled = false,
  error,
}: LiveImageUploadProps) {
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const [previewPosition, setPreviewPosition] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const helpId = useId();
  const statusId = useId();
  const errorId = useId();

  const isUploading = state.kind === "uploading";
  const localError = state.kind === "error" ? state.message : undefined;
  const shownError = error ?? localError;

  function openPicker() {
    inputRef.current?.click();
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }

    const validationError = validateCoverImageFile(file);
    if (validationError) {
      setState({ kind: "error", message: COVER_IMAGE_MESSAGES[validationError] });
      onError?.(COVER_IMAGE_MESSAGES[validationError]);
      return;
    }

    setState({ kind: "uploading" });
    onUploadingChange?.(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
      setState({ kind: "success" });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : COVER_IMAGE_MESSAGES.uploadFailed;
      setState({ kind: "error", message });
      onError?.(message);
    } finally {
      onUploadingChange?.(false);
      // Allow re-selecting the same file after an error.
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleRemove() {
    onChange(null);
    setState({ kind: "idle" });
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={COVER_IMAGE_ACCEPT}
        className="sr-only"
        disabled={disabled || isUploading}
        aria-describedby={helpId}
        onChange={(event) => void handleFiles(event.target.files)}
      />

      {value ? (
        <div className="space-y-3">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob/external cover URL, no optimizer wildcard. */}
            <img
              src={value}
              alt="Prévia da capa da live"
              className="size-full object-cover"
              style={previewPosition ? { objectPosition: previewPosition } : undefined}
              onLoad={(event) =>
                setPreviewPosition(coverObjectPosition(event.currentTarget))
              }
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={openPicker}
              disabled={disabled || isUploading}
              loading={isUploading}
              loadingText="Enviando imagem..."
              className="min-h-11"
            >
              <Upload className="size-4" aria-hidden="true" />
              Trocar imagem
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemove}
              disabled={disabled || isUploading}
              className="min-h-11"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remover imagem
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || isUploading}
          aria-describedby={helpId}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 p-8 text-center transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus className="size-8 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">
            {isUploading ? "Enviando imagem..." : "Adicione uma imagem para sua live"}
          </span>
          <span className="text-sm text-muted-foreground">
            JPG, PNG ou WebP de até 5 MB.
          </span>
          <span className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Escolher imagem
          </span>
        </button>
      )}

      <p id={helpId} className="text-sm text-muted-foreground">
        Escolha uma imagem para representar sua live na vitrine e nos
        compartilhamentos.
      </p>

      <p id={statusId} className="sr-only" aria-live="polite">
        {state.kind === "uploading"
          ? "Enviando imagem..."
          : state.kind === "success"
            ? "Imagem enviada."
            : ""}
      </p>

      {shownError && (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {shownError}
        </p>
      )}
    </div>
  );
}
