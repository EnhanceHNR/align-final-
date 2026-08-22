import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const dbStatus = await prisma.user.count().then(() => "connected").catch((e) => `error: ${e.message}`);
        return NextResponse.json({ status: "ok", database: dbStatus });
    } catch (error: any) {
        return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
    }
}
