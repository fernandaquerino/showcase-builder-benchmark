"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/auth/field-error";
import { LiveImageUpload } from "@/components/admin/live-image-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTodayForDateInput } from "@/lib/date-input";
import {
  liveInputSchema,
  type LiveFormData,
  type LiveFormValues,
} from "@/lib/validations/live";
import { createLiveAction, updateLiveAction } from "@/server/actions/lives";

const EMPTY_VALUES: LiveFormValues = {
  title: "",
  liveDate: getTodayForDateInput(),
  liveTime: "",
  coverImageUrl: "",
};

type LiveFormProps =
  | {
      mode: "create";
      liveId?: undefined;
      initialValues?: undefined;
      onSaved?: undefined;
      onCoverUploaded?: undefined;
    }
  | {
      mode: "edit";
      liveId: string;
      initialValues: LiveFormValues;
      onSaved?: () => void;
      onCoverUploaded?: (url: string) => void;
    };

export function LiveForm({
  mode,
  liveId,
  initialValues,
  onSaved,
  onCoverUploaded,
}: LiveFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultValues = initialValues ?? EMPTY_VALUES;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    getValues,
    formState: { errors, isDirty },
  } = useForm<LiveFormValues, unknown, LiveFormData>({
    resolver: zodResolver(liveInputSchema),
    defaultValues,
  });

  const coverImageUrl = useWatch({ control, name: "coverImageUrl" });
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverUploadFailed = errors.coverImageUrl?.type === "upload";

  // Warn before leaving with unsaved changes.
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

  function applyResult(
    result: Awaited<ReturnType<typeof createLiveAction>>,
  ): boolean {
    if (result.success) {
      return true;
    }

    setError("root", { message: result.message });
    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (field in liveInputSchema.shape && messages?.[0]) {
        setError(
          field as keyof LiveFormValues,
          { message: messages[0] },
          { shouldFocus: true },
        );
      }
    }
    return false;
  }

  function onSubmit() {
    const values = getValues();

    startTransition(async () => {
      if (mode === "create") {
        const result = await createLiveAction(values);
        if (applyResult(result) && result.success) {
          toast.success("Live criada com sucesso.");
          router.push(`/admin/lives/${result.data?.liveId}?created=1`);
        }
        return;
      }

      const result = await updateLiveAction(liveId, values);
      if (applyResult(result)) {
        toast.success("Alterações salvas.");
        onSaved?.();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {errors.root?.message && (
        <Alert aria-live="assertive" className="border-destructive/30">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
          {...register("title")}
        />
        <FieldError id="title-error" message={errors.title?.message} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="liveDate">Data da live</Label>
          <Input
            id="liveDate"
            type="date"
            aria-invalid={Boolean(errors.liveDate)}
            aria-describedby={errors.liveDate ? "liveDate-error" : undefined}
            {...register("liveDate")}
          />
          <FieldError id="liveDate-error" message={errors.liveDate?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="liveTime">Horário</Label>
          <Input
            id="liveTime"
            type="time"
            aria-invalid={Boolean(errors.liveTime)}
            aria-describedby={errors.liveTime ? "liveTime-error" : undefined}
            {...register("liveTime")}
          />
          <FieldError id="liveTime-error" message={errors.liveTime?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Imagem da live</Label>
        {/* Keep coverImageUrl registered so the upload value participates in
            validation and submit; the creator never edits this URL by hand. */}
        <input type="hidden" {...register("coverImageUrl")} />
        <LiveImageUpload
          value={coverImageUrl?.trim() ? coverImageUrl : null}
          onChange={(url) => {
            setValue("coverImageUrl", url ?? "", { shouldDirty: true });
            if (url) {
              onCoverUploaded?.(url);
            }
          }}
          onUploadingChange={setIsUploadingCover}
          onError={(message) =>
            setError("coverImageUrl", { type: "upload", message })
          }
          disabled={isPending}
          error={errors.coverImageUrl?.message}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button
          type="submit"
          loading={isPending}
          loadingText="Salvando..."
          disabled={isUploadingCover || coverUploadFailed}
        >
          {mode === "create" ? "Salvar rascunho" : "Salvar alterações"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin")}
          disabled={isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
