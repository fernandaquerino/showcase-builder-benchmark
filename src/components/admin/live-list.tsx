import { CalendarDays, Clock, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { DeleteLiveDialog } from "@/components/admin/delete-live-dialog";
import { LiveListCover } from "@/components/admin/live-image-upload";
import { LiveStatusBadge } from "@/components/admin/live-status-badge";
import { PublishControl } from "@/components/admin/publish-control";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatLiveDate, formatLiveTime, formatTimestamp } from "@/lib/format";
import { buildPublicUrl } from "@/lib/public-url";
import type { Live } from "@/server/db/queries/lives";

function getPublicLiveUrl(handle: string, slug: string): string {
  return buildPublicUrl(`/${handle}/${slug}`);
}

function LiveListItem({ handle, live }: { handle: string; live: Live }) {
  const time = formatLiveTime(live.liveTime);
  const publicUrl =
    live.status === "published" ? getPublicLiveUrl(handle, live.slug) : null;

  return (
    <Card className="flex flex-col gap-4 p-5">
      {live.coverImageUrl && (
        <div className="aspect-[16/9] overflow-hidden rounded-lg border bg-muted">
          <LiveListCover
            liveId={live.id}
            src={live.coverImageUrl}
            alt={`Capa da live ${live.title}`}
            className="size-full object-cover"
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">
            <Link
              href={`/admin/lives/${live.id}`}
              className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {live.title}
            </Link>
          </h2>
        </div>
        <LiveStatusBadge status={live.status} />
      </div>

      <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-4" aria-hidden="true" />
          <dt className="sr-only">Data</dt>
          <dd>{formatLiveDate(live.liveDate)}</dd>
        </div>
        {time && (
          <div className="flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden="true" />
            <dt className="sr-only">Horário</dt>
            <dd>{time}</dd>
          </div>
        )}
      </dl>

      <p className="text-sm text-muted-foreground">
        {publicUrl ? (
          <>
            Link da live:{" "}
            <Link
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {publicUrl}
            </Link>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
          </>
        ) : null}
        Atualizada em {formatTimestamp(live.updatedAt)}
      </p>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/lives/${live.id}`}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Link>
        </Button>
        <PublishControl liveId={live.id} status={live.status} />
        <DeleteLiveDialog
          liveId={live.id}
          title={live.title}
          status={live.status}
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto text-muted-foreground hover:text-destructive"
              aria-label={`Excluir live ${live.title}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          }
        />
      </div>
    </Card>
  );
}

export function LiveList({ handle, lives }: { handle: string; lives: Live[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {lives.map((live) => (
        <li key={live.id}>
          <LiveListItem handle={handle} live={live} />
        </li>
      ))}
    </ul>
  );
}
