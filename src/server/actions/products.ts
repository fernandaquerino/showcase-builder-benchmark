"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { revalidatePublicShowcase } from "@/server/cache/showcase";
import {
  productBatchInputSchema,
  productIdSchema,
  productInputSchema,
  reorderProductsSchema,
  type ProductBatchInput,
  type ProductFormValues,
} from "@/lib/validations/product";
import { liveIdSchema } from "@/lib/validations/live";
import type { ActionResult } from "@/server/actions/action-result";
import {
  createProduct,
  createProductsBatch,
  deleteProduct,
  getProductsByLiveIdForUser,
  reorderProducts,
  updateProduct,
} from "@/server/db/queries/products";
import { getPublishedLiveContextById } from "@/server/db/queries/public-showcase";

const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente.";
const NOT_FOUND = "Não encontramos esse produto.";
const LIVE_NOT_FOUND = "Não encontramos essa live.";
const GENERIC_SAVE_ERROR =
  "Não foi possível salvar o produto. Tente novamente.";
const REORDER_ERROR =
  "Não foi possível salvar a nova ordem. A ordem anterior foi restaurada.";

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function revalidateLive(liveId: string): void {
  revalidatePath(`/admin/lives/${liveId}`);
}

async function revalidatePublicLiveIfPublished(liveId: string): Promise<void> {
  const context = await getPublishedLiveContextById(liveId);
  if (context?.status === "published") {
    revalidatePublicShowcase(context);
  }
}

function logFailure(message: string, error: unknown): void {
  console.error(message, {
    cause: error instanceof Error ? error.name : "UnknownError",
  });
}

export async function createProductAction(
  liveId: string,
  input: ProductFormValues,
): Promise<ActionResult<{ liveId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedLiveId = liveIdSchema.safeParse(liveId);
  if (!parsedLiveId.success) {
    return { success: false, message: LIVE_NOT_FOUND };
  }

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const product = await createProduct(parsedLiveId.data, userId, parsed.data);
    if (!product) {
      return { success: false, message: LIVE_NOT_FOUND };
    }

    revalidateLive(parsedLiveId.data);
    await revalidatePublicLiveIfPublished(parsedLiveId.data);
    return { success: true, data: { liveId: parsedLiveId.data } };
  } catch (error) {
    logFailure("Create product failed.", error);
    return { success: false, message: GENERIC_SAVE_ERROR };
  }
}

export type BatchSaveResult =
  | { success: true; count: number }
  | { success: false; message: string; failedIndexes?: number[] };

/**
 * Saves several reviewed products at once. Receives only the items the creator
 * marked ready and selected in the bulk import. The server re-validates every
 * item, recomputes positions, and persists them in a single atomic insert so a
 * single bad item rolls back the whole batch (nothing is saved partially).
 */
export async function createProductsBatchAction(
  liveId: string,
  input: ProductBatchInput,
): Promise<BatchSaveResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedLiveId = liveIdSchema.safeParse(liveId);
  if (!parsedLiveId.success) {
    return { success: false, message: LIVE_NOT_FOUND };
  }

  const parsed = productBatchInputSchema.safeParse(input);
  if (!parsed.success) {
    // Report which items failed so the review screen can highlight them
    // instead of saving a partial, inconsistent batch.
    const failedIndexes = Array.from(
      new Set(
        parsed.error.issues
          .map((issue) => issue.path[0])
          .filter((index): index is number => typeof index === "number"),
      ),
    ).sort((a, b) => a - b);

    return {
      success: false,
      message:
        "Alguns produtos ainda precisam de revisão. Nenhum produto foi adicionado.",
      failedIndexes,
    };
  }

  try {
    const result = await createProductsBatch(
      parsedLiveId.data,
      userId,
      parsed.data,
    );
    if (!result) {
      return { success: false, message: LIVE_NOT_FOUND };
    }

    revalidateLive(parsedLiveId.data);
    await revalidatePublicLiveIfPublished(parsedLiveId.data);
    return { success: true, count: result.count };
  } catch (error) {
    logFailure("Create products batch failed.", error);
    return { success: false, message: GENERIC_SAVE_ERROR };
  }
}

export async function updateProductAction(
  liveId: string,
  productId: string,
  input: ProductFormValues,
): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedLiveId = liveIdSchema.safeParse(liveId);
  const parsedProductId = productIdSchema.safeParse(productId);
  if (!parsedLiveId.success || !parsedProductId.success) {
    return { success: false, message: NOT_FOUND };
  }

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const product = await updateProduct(
      parsedProductId.data,
      parsedLiveId.data,
      userId,
      parsed.data,
    );
    if (!product) {
      return { success: false, message: NOT_FOUND };
    }

    revalidateLive(parsedLiveId.data);
    await revalidatePublicLiveIfPublished(parsedLiveId.data);
    return { success: true };
  } catch (error) {
    logFailure("Update product failed.", error);
    return { success: false, message: GENERIC_SAVE_ERROR };
  }
}

export async function deleteProductAction(
  liveId: string,
  productId: string,
): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedLiveId = liveIdSchema.safeParse(liveId);
  const parsedProductId = productIdSchema.safeParse(productId);
  if (!parsedLiveId.success || !parsedProductId.success) {
    return { success: false, message: NOT_FOUND };
  }

  try {
    const deleted = await deleteProduct(
      parsedProductId.data,
      parsedLiveId.data,
      userId,
    );
    if (!deleted) {
      return { success: false, message: NOT_FOUND };
    }

    revalidateLive(parsedLiveId.data);
    await revalidatePublicLiveIfPublished(parsedLiveId.data);
    return { success: true };
  } catch (error) {
    logFailure("Delete product failed.", error);
    return {
      success: false,
      message: "Não foi possível excluir o produto. Tente novamente.",
    };
  }
}

export async function reorderProductsAction(
  liveId: string,
  orderedProductIds: string[],
): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedLiveId = liveIdSchema.safeParse(liveId);
  if (!parsedLiveId.success) {
    return { success: false, message: LIVE_NOT_FOUND };
  }

  const parsed = reorderProductsSchema.safeParse({ orderedProductIds });
  if (!parsed.success) {
    return { success: false, message: REORDER_ERROR };
  }

  try {
    const result = await reorderProducts(
      parsedLiveId.data,
      userId,
      parsed.data.orderedProductIds,
    );
    if (!result.ok) {
      return { success: false, message: REORDER_ERROR };
    }

    revalidateLive(parsedLiveId.data);
    await revalidatePublicLiveIfPublished(parsedLiveId.data);
    return { success: true };
  } catch (error) {
    logFailure("Reorder products failed.", error);
    return { success: false, message: REORDER_ERROR };
  }
}

/**
 * Moves a product to a new slot. The new order is computed on the server from
 * the live's current order, then persisted through the validated reorder path,
 * so a manipulated client payload cannot shuffle products arbitrarily.
 */
async function moveProduct(
  liveId: string,
  productId: string,
  resolveTarget: (index: number, orderedIds: string[]) => number,
): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const parsedLiveId = liveIdSchema.safeParse(liveId);
  const parsedProductId = productIdSchema.safeParse(productId);
  if (!parsedLiveId.success || !parsedProductId.success) {
    return { success: false, message: NOT_FOUND };
  }

  try {
    const current = await getProductsByLiveIdForUser(parsedLiveId.data, userId);
    const index = current.findIndex((p) => p.id === parsedProductId.data);
    if (index === -1) {
      return { success: false, message: NOT_FOUND };
    }

    const ordered = current.map((p) => p.id);
    const target = resolveTarget(index, ordered);
    if (target < 0 || target >= current.length || target === index) {
      return { success: true };
    }

    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    const result = await reorderProducts(parsedLiveId.data, userId, ordered);
    if (!result.ok) {
      return { success: false, message: REORDER_ERROR };
    }

    revalidateLive(parsedLiveId.data);
    await revalidatePublicLiveIfPublished(parsedLiveId.data);
    return { success: true };
  } catch (error) {
    logFailure("Move product failed.", error);
    return { success: false, message: REORDER_ERROR };
  }
}

export async function moveProductUpAction(
  liveId: string,
  productId: string,
): Promise<ActionResult> {
  return moveProduct(liveId, productId, (index) => index - 1);
}

export async function moveProductDownAction(
  liveId: string,
  productId: string,
): Promise<ActionResult> {
  return moveProduct(liveId, productId, (index) => index + 1);
}

/**
 * Drag and drop: moves a product into the slot of the product it was dropped
 * on. Only ids travel from the client; the order itself is resolved above.
 */
export async function moveProductToAction(
  liveId: string,
  productId: string,
  targetProductId: string,
): Promise<ActionResult> {
  const parsedTargetId = productIdSchema.safeParse(targetProductId);
  if (!parsedTargetId.success) {
    return { success: false, message: NOT_FOUND };
  }

  return moveProduct(liveId, productId, (_index, orderedIds) =>
    orderedIds.indexOf(parsedTargetId.data),
  );
}
