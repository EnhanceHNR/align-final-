import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminStorage } from "@/lib/firebase-admin";

export async function GET() {
    try {
        const dbStatus = await prisma.user.count().then(() => "connected").catch((e) => `error: ${e.message}`);
        
        return NextResponse.json({
            status: "ok",
            database: dbStatus,
            firebaseAdmin: adminStorage ? "initialized" : "null",
            env: {
                hasDbUrl: !!process.env.DATABASE_URL,
                hasFirebaseKey: !!process.env.GCP_SERVICE_ACCOUNT_KEY,
                nodeEnv: process.env.NODE_ENV
            }
        });
    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
    }
}
