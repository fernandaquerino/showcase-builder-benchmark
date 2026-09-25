import { CalendarDays, Clock, ImageIcon } from "lucide-react";

import { EditLiveDetailsSheet } from "@/components/admin/edit-live-details-sheet";
import { LiveCoverThumbnail } from "@/components/admin/live-image-upload";
import { LiveStatusBadge } from "@/components/admin/live-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatLiveDate, formatLiveTime } from "@/lib/format";
import type { LiveFormValues } from "@/lib/validations/live";
import type { Live } from "@/server/db/queries/lives";

export function CompactLiveSummaryCard({
  live,
  productCount,
  initialValues,
}: {
  live: Live;
  productCount: number;
  initialValues: LiveFormValues;
}) {
  const time = formatLiveTime(live.liveTime);
  const productLabel =
    productCount === 1 ? "1 produto" : `${productCount} produtos`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground sm:size-20">
            {live.coverImageUrl ? (
              <LiveCoverThumbnail
                src={live.coverImageUrl}
                className="size-full object-cover"
              />
            ) : (
              <ImageIcon className="size-6" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold">{live.title}</h2>
              <LiveStatusBadge status={live.status} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatLiveDate(live.liveDate)}
              </span>
              {time ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden="true" />
                  {time}
                </span>
              ) : null}
              <span>{productLabel}</span>
            </div>
          </div>
        </div>

        <EditLiveDetailsSheet
          liveId={live.id}
          initialValues={initialValues}
        />
      </CardContent>
    </Card>
  );
}
