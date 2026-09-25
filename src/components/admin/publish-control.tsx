"use client";

import { Globe, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  LIVE_STATUS_FILTERS,
  type LiveStatusFilter,
} from "@/lib/validations/live";
import { publishLiveAction, unpublishLiveAction } from "@/server/actions/lives";

const statusFilterLabels: Record<LiveStatusFilter, string> = {
  todas: "Todas",
  publicadas: "Publicadas",
  rascunhos: "Rascunhos",
};

/** Filters the lives list by status, keeping the choice in the URL. */
export function LiveStatusFilterTabs({
  current,
  counts,
}: {
  current: LiveStatusFilter;
  counts: Record<LiveStatusFilter, number>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(current);
  const [isPending, startTransition] = useTransition();

  function select(filter: LiveStatusFilter) {
    setSelected(filter);
    startTransition(() => {
      router.push(filter === "todas" ? "/admin" : `/admin?status=${filter}`, {
        scroll: false,
      });
    });
  }

  return (
    <div
      role="group"
      aria-label="Filtrar lives por status"
      aria-busy={isPending}
      className="flex flex-wrap gap-2"
    >
      {LIVE_STATUS_FILTERS.map((filter) => (
        <Button
          key={filter}
          type="button"
          size="sm"
          variant={selected === filter ? "default" : "outline"}
          aria-pressed={selected === filter}
          onClick={() => select(filter)}
        >
          {statusFilterLabels[filter]}
          <span className="opacity-75">{counts[filter]}</span>
        </Button>
      ))}
    </div>
  );
}

type PublishControlProps = {
  liveId: string;
  status: "draft" | "published";
  size?: ButtonProps["size"];
  fullWidth?: boolean;
};

export function PublishControl({
  liveId,
  status,
  size = "sm",
  fullWidth = false,
}: PublishControlProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    startTransition(async () => {
      const result = await publishLiveAction(liveId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Live publicada. As outras lives foram despublicadas.");
      router.refresh();
    });
  }

  function handleUnpublish() {
    startTransition(async () => {
      const result = await unpublishLiveAction(liveId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Live despublicada.");
      setOpen(false);
      router.refresh();
    });
  }

  if (status === "draft") {
    return (
      <Button
        variant="success"
        size={size}
        fullWidth={fullWidth}
        onClick={handlePublish}
        loading={isPending}
        loadingText="Publicando..."
      >
        <Globe className="size-4" aria-hidden="true" />
        Publicar
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size={size} fullWidth={fullWidth}>
          <Undo2 className="size-4" aria-hidden="true" />
          Despublicar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Despublicar esta live?</AlertDialogTitle>
          <AlertDialogDescription>
            A página pública desta live deixará de ser exibida para seus
            seguidores até que você publique novamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="ghost" disabled={isPending}>
              Cancelar
            </Button>
          </AlertDialogCancel>
          <Button
            variant="default"
            onClick={handleUnpublish}
            loading={isPending}
            loadingText="Despublicando..."
          >
            Despublicar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
