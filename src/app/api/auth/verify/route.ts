import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
        return new NextResponse("Missing verification token", { status: 400 });
    }

    try {
        const tokensSnap = await adminDb.collection("verificationTokens").where("token", "==", token).limit(1).get();
        if (tokensSnap.empty) {
            return new NextResponse("Invalid or expired token", { status: 400 });
        }

        const tokenDoc = tokensSnap.docs[0];
        const tokenData = tokenDoc.data();

        if (tokenData.expiresAt.toDate() < new Date()) {
            return new NextResponse("Token has expired", { status: 400 });
        }

        // Verify the user
        await adminDb.collection("users").doc(tokenData.userId).update({
            emailVerified: true,
            updatedAt: new Date()
        });

        // Delete the token
        await tokenDoc.ref.delete();

        // Redirect to login page with success message
        const baseUrl = process.env.NEXTAUTH_URL || (req.headers.get("origin") || "http://localhost:3000");
        return NextResponse.redirect(`${baseUrl}/?verified=true`);

    } catch (error: any) {
        console.error("Verification error:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
