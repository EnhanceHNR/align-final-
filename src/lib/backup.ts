import { adminDb, adminStorage } from "@/lib/firebaseAdmin";

// Every collection that holds real customer/user data. Kept as an explicit
// list (rather than adminDb.listCollections()) so a backup run is predictable
// and reviewable.
//
// SAFETY INVARIANT: nothing in this file ever calls `.delete()` on a
// Firestore document, and restore only ever `.set(data, { merge: true })`s
// documents back. A backup or restore can add or refresh data, but it can
// never remove a user, an organization, or any of their records.
export const BACKUP_COLLECTIONS = [
    "organizations",
    "users",
    "employeeProfiles",
    "patients",
    "appointments",
    "visitNotes",
    "treatmentPlans",
    "treatments",
    "odontogramSurfaces",
    "anamneses",
    "invoices",
    "invoiceItems",
    "labs",
    "labSubmissions",
    "labTransactions",
    "instructionTemplates",
    "inventoryItems",
    "dealers",
    "purchaseOrders",
    "stockEntries",
    "attendances",
    "attendanceSessions",
    "shiftSegments",
    "payrolls",
    "documents",
    "holidays",
    "leaveRequests",
    "resignationRequests",
    "missedPunchRequests",
    "earlyPunchOutRequests",
    "lateRequests",
    "learningCategories",
    "learningMaterials",
    "chairs",
    "doctors",
    "procedures",
] as const;

// Firestore Timestamps (and any nested ones) don't survive JSON.stringify
// usefully -- turn them into a tagged plain object we can restore exactly.
function serializeValue(value: any): any {
    if (value === null || value === undefined) return value;
    if (typeof value?.toDate === "function") {
        return { __ts__: value.toDate().toISOString() };
    }
    if (Array.isArray(value)) return value.map(serializeValue);
    if (typeof value === "object") {
        const out: Record<string, any> = {};
        for (const k of Object.keys(value)) out[k] = serializeValue(value[k]);
        return out;
    }
    return value;
}

function deserializeValue(value: any): any {
    if (value === null || value === undefined) return value;
    if (typeof value === "object" && "__ts__" in value && Object.keys(value).length === 1) {
        return new Date(value.__ts__);
    }
    if (Array.isArray(value)) return value.map(deserializeValue);
    if (typeof value === "object") {
        const out: Record<string, any> = {};
        for (const k of Object.keys(value)) out[k] = deserializeValue(value[k]);
        return out;
    }
    return value;
}

export type BackupSummary = {
    backupId: string;
    startedAt: string;
    finishedAt: string;
    collections: { name: string; count: number }[];
    totalDocs: number;
};

// Exports every collection in BACKUP_COLLECTIONS to Firebase Storage under
// backups/<timestamp>/<collection>.json, plus a manifest.json. Every run
// writes a brand-new, timestamped folder -- older backups are never
// overwritten or touched, let alone deleted.
export async function runBackup(triggeredBy: string): Promise<BackupSummary> {
    const startedAt = new Date();
    const backupId = startedAt.toISOString().replace(/[:.]/g, "-");
    const bucket = adminStorage.bucket();
    const summary: { name: string; count: number }[] = [];
    let totalDocs = 0;

    for (const name of BACKUP_COLLECTIONS) {
        const snap = await adminDb.collection(name).get();
        const docs = snap.docs.map((d: any) => ({ id: d.id, data: serializeValue(d.data()) }));
        const file = bucket.file(`backups/${backupId}/${name}.json`);
        await file.save(JSON.stringify(docs), { contentType: "application/json" });
        summary.push({ name, count: docs.length });
        totalDocs += docs.length;
    }

    const finishedAt = new Date();
    const manifest = {
        backupId,
        triggeredBy,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        collections: summary,
        totalDocs,
    };
    await bucket.file(`backups/${backupId}/manifest.json`).save(JSON.stringify(manifest, null, 2), {
        contentType: "application/json",
    });

    await adminDb.collection("backupRuns").doc(backupId).set({
        ...manifest,
        status: "completed",
    });

    return { backupId, startedAt: startedAt.toISOString(), finishedAt: finishedAt.toISOString(), collections: summary, totalDocs };
}

export type RestoreSummary = {
    backupId: string;
    restoredDocs: number;
    collections: { name: string; count: number }[];
};

// Restores a previous backup by upserting every document back into Firestore
// with { merge: true }. This can only add or refresh fields -- it never
// deletes a document, a collection, or a field, even if that field is no
// longer present in the backup copy.
export async function restoreBackup(backupId: string): Promise<RestoreSummary> {
    const bucket = adminStorage.bucket();
    const [manifestBuf] = await bucket.file(`backups/${backupId}/manifest.json`).download();
    const manifest = JSON.parse(manifestBuf.toString("utf-8"));

    const collections: { name: string; count: number }[] = [];
    let restoredDocs = 0;

    for (const { name } of manifest.collections as { name: string; count: number }[]) {
        const file = bucket.file(`backups/${backupId}/${name}.json`);
        const [exists] = await file.exists();
        if (!exists) continue;
        const [buf] = await file.download();
        const docs: { id: string; data: any }[] = JSON.parse(buf.toString("utf-8"));

        let batch = adminDb.batch();
        let ops = 0;
        for (const doc of docs) {
            const ref = adminDb.collection(name).doc(doc.id);
            batch.set(ref, deserializeValue(doc.data), { merge: true });
            ops++;
            restoredDocs++;
            if (ops >= 400) {
                await batch.commit();
                batch = adminDb.batch();
                ops = 0;
            }
        }
        if (ops > 0) await batch.commit();
        collections.push({ name, count: docs.length });
    }

    await adminDb.collection("backupRuns").doc(backupId).set(
        { lastRestoredAt: new Date().toISOString() },
        { merge: true }
    );

    return { backupId, restoredDocs, collections };
}

export async function listBackups() {
    const snap = await adminDb.collection("backupRuns").orderBy("startedAt", "desc").limit(50).get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
}

export type BackupConfig = { frequency: "daily" | "weekly" | "monthly"; enabled: boolean; lastRunAt?: string };

export async function getBackupConfig(): Promise<BackupConfig> {
    const doc = await adminDb.collection("platformConfig").doc("backup").get();
    if (!doc.exists) return { frequency: "daily", enabled: false };
    return doc.data() as BackupConfig;
}

export async function setBackupConfig(config: Partial<BackupConfig>) {
    await adminDb.collection("platformConfig").doc("backup").set(config, { merge: true });
}

// Whether a scheduled (cron-triggered) backup is due right now, given the
// configured frequency and when the last one ran.
export function isBackupDue(config: BackupConfig): boolean {
    if (!config.enabled) return false;
    if (!config.lastRunAt) return true;
    const last = new Date(config.lastRunAt).getTime();
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const intervalMs = config.frequency === "weekly" ? 7 * day : config.frequency === "monthly" ? 30 * day : day;
    return now - last >= intervalMs;
}
