import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
    try {
        const dbStatus = await adminDb.collection('users').limit(1).get().then(() => "connected").catch((e) => `error: ${e.message}`);
        return NextResponse.json({ status: "ok", database: dbStatus });
    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
    }
}
