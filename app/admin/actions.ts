"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { appUrl, notifyUserByEmail } from "@/lib/email/notifications";
import { copy } from "@/lib/copy";

interface ActionResult {
  error: string | null;
}

/** Approves a pending photo → it becomes visible and ratable. */
export async function approvePhoto(photoId: string): Promise<ActionResult> {
  const { adminId, service } = await requireAdmin();
  const { error } = await service
    .from("photos")
    .update({ moderation: "approved" } as never)
    .eq("id", photoId);
  if (error) return { error: "Approve failed." };
  await service.from("moderation_audit").insert({
    actor_id: adminId,
    photo_id: photoId,
    report_id: null,
    action: "photo_approved",
  });

  // Tell the owner their photo is live (best-effort, never blocks).
  const { data: photo } = await service
    .from("photos")
    .select("owner_id")
    .eq("id", photoId)
    .single();
  if (photo) {
    await notifyUserByEmail(
      photo.owner_id,
      copy.emails.approvedSubject,
      copy.emails.approvedBody(appUrl())
    );
  }

  revalidatePath("/admin");
  return { error: null };
}

/** Rejects a photo → owner sees the rejection copy and must re-upload. */
export async function rejectPhoto(photoId: string, reportId?: string): Promise<ActionResult> {
  const { adminId, service } = await requireAdmin();
  const { error } = await service
    .from("photos")
    .update({ moderation: "rejected" } as never)
    .eq("id", photoId);
  if (error) return { error: "Reject failed." };
  if (reportId) {
    await service.from("reports").update({ status: "actioned" } as never).eq("id", reportId);
  }
  await service.from("moderation_audit").insert({
    actor_id: adminId,
    photo_id: photoId,
    report_id: reportId ?? null,
    action: "photo_rejected",
  });
  revalidatePath("/admin");
  return { error: null };
}

/** Removes a photo entirely (status = removed) — it leaves feeds at once. */
export async function removePhoto(photoId: string, reportId?: string): Promise<ActionResult> {
  const { adminId, service } = await requireAdmin();
  const { error } = await service
    .from("photos")
    .update({ status: "removed" } as never)
    .eq("id", photoId);
  if (error) return { error: "Remove failed." };
  if (reportId) {
    await service.from("reports").update({ status: "actioned" } as never).eq("id", reportId);
  }
  await service.from("moderation_audit").insert({
    actor_id: adminId,
    photo_id: photoId,
    report_id: reportId ?? null,
    action: "photo_removed",
  });
  revalidatePath("/admin");
  return { error: null };
}

/** Closes a report without acting on the content. */
export async function dismissReport(reportId: string): Promise<ActionResult> {
  const { adminId, service } = await requireAdmin();
  const { error } = await service
    .from("reports")
    .update({ status: "dismissed" } as never)
    .eq("id", reportId);
  if (error) return { error: "Dismiss failed." };
  await service.from("moderation_audit").insert({
    actor_id: adminId,
    photo_id: null,
    report_id: reportId,
    action: "report_dismissed",
  });
  revalidatePath("/admin");
  return { error: null };
}
