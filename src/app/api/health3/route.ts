import { NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";

export async function GET() {
    try {
        return NextResponse.json({ status: "ok", firebaseAdmin: adminStorage ? "initialized" : "null" });
    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
    }
}
