/**
 * Seed script — creates initial MASTER and STAFF users.
 *
 * Run with:
 * npx tsx src/scripts/seed-user.ts
 *
 * Safe to run multiple times: uses upsert so it won't duplicate records.
 */

import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";

async function main() {
    console.log("🌱 Seeding initial users...");

    // ── MASTER user ────────────────────────────────────────────────────────────
    const masterHash = await hashPassword("password123");

    const master = await prisma.user.upsert({
        where: { email: "admin@align.com" },
        update: {},
        create: {
            email: "admin@align.com",
            passwordHash: masterHash,
            role: "MASTER",
            isActive: true,
        },
    });
    console.log(`✅ Master user ready: ${master.email}`);

    // ── STAFF user ─────────────────────────────────────────────────────────────
    const staffHash = await hashPassword("staff123");

    const staff = await prisma.user.upsert({
        where: { email: "staff@align.com" },
        update: {},
        create: {
            email: "staff@align.com",
            passwordHash: staffHash,
            role: "STAFF",
            isActive: true,
        },
    });
    console.log(`✅ Staff user ready: ${staff.email}`);
}

async function run() {
    try {
        await main();
        console.log("🚀 Seeding completed successfully!");
    } catch (err) {
        console.error("❌ Seed failed:", err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

run();