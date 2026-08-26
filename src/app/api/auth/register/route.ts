import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { clinicName, email, password } = await req.json();

    if (!clinicName || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUsers = await adminDb.collection("users").where("email", "==", email).get();
    if (!existingUsers.empty) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const slug = clinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const passwordHash = await bcrypt.hash(password, 10);

    // Create Organization and User
    const orgRef = adminDb.collection("organizations").doc();
    const orgId = orgRef.id;
    await orgRef.set({
        name: clinicName,
        slug: slug + "-" + Math.floor(Math.random() * 1000), // ensure uniqueness
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const userRef = adminDb.collection("users").doc();
    const userId = userRef.id;
    await userRef.set({
        email,
        passwordHash,
        role: "MASTER",
        isActive: true,
        emailVerified: false,
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    
    await adminDb.collection("employeeProfiles").doc().set({
        userId: userId,
        name: clinicName + " Admin",
        employeeType: "Super Admin",
        organizationId: orgId,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    // Generate Verification Token
    const token = crypto.randomBytes(32).toString("hex");
    await adminDb.collection("verificationTokens").doc().set({
        userId: userId,
        token: token,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Determine Base URL
    const baseUrl = process.env.NEXTAUTH_URL || (req.headers.get("origin") || "http://localhost:3000");
    const verificationUrl = `${baseUrl}/api/auth/verify?token=${token}`;

    // Send Verification Email via Firebase Trigger Email Extension (mail collection)
    await adminDb.collection("mail").doc().set({
        to: email,
        message: {
            subject: "Verify your email for Align.io Workspace",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Welcome to Align.io!</h2>
                    <p>Thank you for registering your clinic workspace: <b>${clinicName}</b>.</p>
                    <p>Please click the button below to verify your email address:</p>
                    <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px;">Verify Email</a>
                    <p>Or paste this link into your browser:</p>
                    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
            `
        }
    });

    return NextResponse.json({ success: true, organizationId: orgId });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
