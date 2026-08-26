/**
 * Seed script — creates initial MASTER and STAFF users.
 *
 * Run with:
 * npx tsx src/scripts/seed-user.ts
 *
 * Safe to run multiple times: checks if users exist before creating.
 */

import { adminDb } from "../lib/firebaseAdmin";
import { hashPassword } from "../lib/password";

async function main() {
    console.log("🌱 Seeding initial users...");

    // Create an organization for the seeded users
    const orgQuery = await adminDb.collection("organizations").where("name", "==", "Align Default").get();
    let orgId = "";
    if (orgQuery.empty) {
        const orgRef = adminDb.collection("organizations").doc();
        orgId = orgRef.id;
        await orgRef.set({
            name: "Align Default",
            slug: "align-default",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    } else {
        orgId = orgQuery.docs[0].id;
    }

    // ── MASTER user ────────────────────────────────────────────────────────────
    const masterQuery = await adminDb.collection("users").where("email", "==", "admin@align.com").get();
    if (masterQuery.empty) {
        const masterHash = await hashPassword("password123");
        await adminDb.collection("users").doc().set({
            email: "admin@align.com",
            passwordHash: masterHash,
            role: "MASTER",
            isActive: true,
            organizationId: orgId,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`✅ Master user created: admin@align.com`);
    } else {
        console.log(`✅ Master user already exists: admin@align.com`);
    }

    // ── STAFF user ─────────────────────────────────────────────────────────────
    const staffQuery = await adminDb.collection("users").where("email", "==", "staff@align.com").get();
    if (staffQuery.empty) {
        const staffHash = await hashPassword("staff123");
        await adminDb.collection("users").doc().set({
            email: "staff@align.com",
            passwordHash: staffHash,
            role: "STAFF",
            isActive: true,
            organizationId: orgId,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`✅ Staff user created: staff@align.com`);
    } else {
        console.log(`✅ Staff user already exists: staff@align.com`);
    }
}

async function run() {
    try {
        await main();
        console.log("🚀 Seeding completed successfully!");
    } catch (err) {
        console.error("❌ Seed failed:", err);
        process.exit(1);
    }
}

run();
