import { AppNav } from "@/components/app-nav";
import { requireAdmin } from "@/lib/admin";
import { SafePhoto } from "@/components/safe-photo";
import { PendingPhotoControls, ReportControls } from "./admin-controls";
import { DmMember } from "./dm-member";

/**
 * The moderation desk: pending photos awaiting a verdict, and open
 * safety reports. Data is fetched with the service role AFTER the admin
 * check — regular RLS would (correctly) hide pending photos and other
 * people's reports from us.
 */
export default async function AdminPage() {
  const { service } = await requireAdmin();

  const [{ data: pendingPhotos }, { data: openReports }] = await Promise.all([
    service
      .from("photos")
      .select("id, owner_id, created_at")
      .eq("status", "active")
      .eq("moderation", "pending")
      .order("created_at", { ascending: true })
      .limit(50),
    service
      .from("reports")
      .select("id, reason, photo_id, message_id, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  // Context for reports: reported message bodies, in one query.
  const messageIds = (openReports ?? [])
    .map((report) => report.message_id)
    .filter((id): id is string => id !== null);
  const { data: reportedMessages } = messageIds.length
    ? await service.from("messages").select("id, body").in("id", messageIds)
    : { data: [] };
  const messageBodyById = new Map((reportedMessages ?? []).map((m) => [m.id, m.body]));

  // Whose photo is this? Owner usernames for every photo on the desk
  // (pending queue + reported photos).
  const reportedPhotoIds = (openReports ?? [])
    .map((report) => report.photo_id)
    .filter((id): id is string => id !== null);
  const { data: reportedPhotos } = reportedPhotoIds.length
    ? await service.from("photos").select("id, owner_id").in("id", reportedPhotoIds)
    : { data: [] };
  const ownerIdByPhotoId = new Map<string, string>([
    ...(pendingPhotos ?? []).map((photo) => [photo.id, photo.owner_id] as [string, string]),
    ...(reportedPhotos ?? []).map((photo) => [photo.id, photo.owner_id] as [string, string]),
  ]);
  const ownerIds = [...new Set(ownerIdByPhotoId.values())];
  const { data: owners } = ownerIds.length
    ? await service.from("profiles").select("id, username").in("id", ownerIds)
    : { data: [] };
  const usernameByOwnerId = new Map((owners ?? []).map((owner) => [owner.id, owner.username]));
  const usernameForPhoto = (photoId: string) => {
    const ownerId = ownerIdByPhotoId.get(photoId);
    return ownerId ? usernameByOwnerId.get(ownerId) : undefined;
  };

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="font-display text-2xl text-ink">Moderation desk</h1>

        <section className="mt-6">
          <h2 className="text-sm font-bold text-ink">Message a member</h2>
          <div className="mt-3">
            <DmMember />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-ink">
            Pending photos ({(pendingPhotos ?? []).length})
          </h2>
          {(pendingPhotos ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-ink-faint">Queue is empty. Nice.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-4">
              {(pendingPhotos ?? []).map((photo) => (
                <li key={photo.id} className="rounded-lg border border-line bg-surface p-3">
                  <SafePhoto photoId={photo.id} alt="Pending photo" />
                  <p className="mt-2 text-sm font-semibold text-ink">
                    @{usernameForPhoto(photo.id) ?? "unknown"}
                  </p>
                  <p className="text-xs text-ink-faint">
                    Uploaded {new Date(photo.created_at).toLocaleString()}
                  </p>
                  <PendingPhotoControls photoId={photo.id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-ink">
            Open reports ({(openReports ?? []).length})
          </h2>
          {(openReports ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-ink-faint">No open reports.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-4">
              {(openReports ?? []).map((report) => (
                <li key={report.id} className="rounded-lg border border-line bg-surface p-3">
                  <p className="text-sm font-semibold text-ink">{report.reason}</p>
                  <p className="mt-1 text-xs text-ink-faint">
                    {new Date(report.created_at).toLocaleString()}
                  </p>
                  {report.photo_id && (
                    <div className="mt-2">
                      <SafePhoto photoId={report.photo_id} alt="Reported photo" />
                      <p className="mt-2 text-sm font-semibold text-ink">
                        @{usernameForPhoto(report.photo_id) ?? "unknown"}
                      </p>
                    </div>
                  )}
                  {report.message_id && (
                    <blockquote className="mt-2 rounded-md bg-surface-2 p-3 text-sm text-ink">
                      {messageBodyById.get(report.message_id) ?? "(message deleted)"}
                    </blockquote>
                  )}
                  <ReportControls reportId={report.id} photoId={report.photo_id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
