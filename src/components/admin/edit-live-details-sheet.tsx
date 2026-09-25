"use client";

import { Pencil } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { LiveForm } from "@/components/admin/live-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { LiveFormValues } from "@/lib/validations/live";

const EDIT_PARAM = "editar";
const EDIT_VALUE = "dados";

export function EditLiveDetailsSheet({
  liveId,
  initialValues,
}: {
  liveId: string;
  initialValues: LiveFormValues;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The open sheet lives in the URL (?editar=dados), so it can be linked to
  // and the phone's back gesture closes it instead of leaving the page.
  const openInUrl = searchParams.get(EDIT_PARAM) === EDIT_VALUE;
  const [open, setOpen] = useState(openInUrl);
  const [syncedOpenInUrl, setSyncedOpenInUrl] = useState(openInUrl);
  if (openInUrl !== syncedOpenInUrl) {
    setSyncedOpenInUrl(openInUrl);
    if (openInUrl) {
      setOpen(true);
    }
  }

  // A cover upload can finish after the sheet was closed; keep its URL so
  // reopening the sheet doesn't lose the new image.
  const [uploadedCover, setUploadedCover] = useState<string | null>(null);

  function urlWithEditParam(value: string | null): string {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(EDIT_PARAM, value);
    } else {
      params.delete(EDIT_PARAM);
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen && !openInUrl) {
      window.history.pushState(null, "", urlWithEditParam(EDIT_VALUE));
    } else if (!nextOpen && openInUrl) {
      window.history.replaceState(null, "", urlWithEditParam(null));
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11">
          <Pencil className="size-4" aria-hidden="true" />
          Editar dados da live
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby="edit-live-details-description">
        <SheetHeader>
          <SheetTitle>Editar dados da live</SheetTitle>
          <SheetDescription id="edit-live-details-description">
            Atualize as informações principais da vitrine.
          </SheetDescription>
        </SheetHeader>
        <LiveForm
          mode="edit"
          liveId={liveId}
          initialValues={
            uploadedCover
              ? { ...initialValues, coverImageUrl: uploadedCover }
              : initialValues
          }
          onCoverUploaded={setUploadedCover}
          onSaved={() => handleOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
