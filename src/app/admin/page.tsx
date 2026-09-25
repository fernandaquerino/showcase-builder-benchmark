import type { Metadata } from "next";
import { Plus, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LiveEmptyState } from "@/components/admin/live-empty-state";
import { LiveList } from "@/components/admin/live-list";
import { LiveStatusFilterTabs } from "@/components/admin/publish-control";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import {
  liveStatusFilterSchema,
  type LiveStatusFilter,
} from "@/lib/validations/live";
import { getLivesByUserId, type Live } from "@/server/db/queries/lives";

export const metadata: Metadata = {
  title: "Suas lives",
};

const emptyFilterMessages: Record<LiveStatusFilter, string> = {
  todas: "Nenhuma live por aqui.",
  publicadas: "Nenhuma live publicada no momento.",
  rascunhos: "Nenhum rascunho no momento.",
};

function matchesStatusFilter(live: Live, filter: LiveStatusFilter): boolean {
  if (filter === "publicadas") {
    return live.status === "published";
  }
  if (filter === "rascunhos") {
    return live.status === "draft";
  }
  return true;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const firstName = session.user.name?.split(/\s+/)[0] ?? "criadora";
  const statusFilter = liveStatusFilterSchema.parse(
    (await searchParams).status,
  );

  let lives: Live[] | null = null;

  try {
    lives = await getLivesByUserId(session.user.id);
  } catch (error) {
    console.error("Failed to load lives.", {
      cause: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
            Seu espaço de criação
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Olá, {firstName}.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie as lives de @{session.user.handle}.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/lives/new">
            <Plus className="size-4" aria-hidden="true" />
            Nova live
          </Link>
        </Button>
      </div>

      <section className="mt-10">
        {lives === null ? (
          <Alert
            aria-live="polite"
            className="flex items-start gap-3 border-destructive/30"
          >
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <AlertDescription>
              <strong className="font-medium text-foreground">
                Não foi possível carregar suas lives.
              </strong>{" "}
              Atualize a página e tente novamente.
            </AlertDescription>
          </Alert>
        ) : lives.length === 0 ? (
          <LiveEmptyState />
        ) : (
          <div className="space-y-5">
            <LiveStatusFilterTabs
              current={statusFilter}
              counts={{
                todas: lives.length,
                publicadas: lives.filter((live) =>
                  matchesStatusFilter(live, "publicadas"),
                ).length,
                rascunhos: lives.filter((live) =>
                  matchesStatusFilter(live, "rascunhos"),
                ).length,
              }}
            />
            {lives.some((live) => matchesStatusFilter(live, statusFilter)) ? (
              <LiveList
                handle={session.user.handle}
                lives={lives.filter((live) =>
                  matchesStatusFilter(live, statusFilter),
                )}
              />
            ) : (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {emptyFilterMessages[statusFilter]}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
