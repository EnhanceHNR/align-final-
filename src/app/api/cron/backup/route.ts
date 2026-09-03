import { NextResponse } from "next/server";
import { getBackupConfig, isBackupDue, runBackup, setBackupConfig } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron hits this on a fixed daily schedule (see vercel.json), but the
// Owner's configured frequency (daily/weekly/monthly) is what actually
// decides whether a backup runs -- so the schedule is adjustable from the
// admin panel without a redeploy.
export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getBackupConfig();
    if (!isBackupDue(config)) {
        return NextResponse.json({ skipped: true, reason: "not due", config });
    }

    const summary = await runBackup("scheduler");
    await setBackupConfig({ lastRunAt: summary.finishedAt });
    return NextResponse.json({ skipped: false, summary });
}
