import { NextResponse } from "next/server";
import { google } from "googleapis";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const chairId = searchParams.get("state"); // We passed chairId in state

    if (!code || !chairId) {
        return NextResponse.redirect(new URL("/dashboard/settings?error=missing_params", req.url));
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CALENDAR_CLIENT_ID,
            process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
            `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar/callback`
        );

        const { tokens } = await oauth2Client.getToken(code);
        
        // Update chair with tokens
        await prisma.chair.update({
            where: { id: chairId },
            data: {
                googleAccessToken: tokens.access_token,
                googleRefreshToken: tokens.refresh_token,
                googleSyncEnabled: true,
                googleCalendarId: "primary", // Usually we sync to primary calendar or let them pick
            }
        });

        return NextResponse.redirect(new URL("/dashboard/settings?sync=success", req.url));

    } catch (error) {
        console.error("Google Auth Error:", error);
        return NextResponse.redirect(new URL("/dashboard/settings?error=google_auth_failed", req.url));
    }
}
