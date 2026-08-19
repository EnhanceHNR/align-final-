import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const chairId = searchParams.get("chairId");

    if (!chairId) {
        return NextResponse.json({ error: "Missing chairId" }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar/callback`
    );

    const scopes = [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly"
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent", // Force to get refresh token
        scope: scopes,
        state: chairId, // Pass chairId through state
    });

    return NextResponse.redirect(url);
}
