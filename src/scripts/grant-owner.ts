/**
 * Grants (or revokes) the platform "Owner" tier for an existing user by
 * email. The Owner tier (`isSuperAdmin: true`) is the top of the role
 * hierarchy -- it's what unlocks /superadmin (MRR, all-organization user
 * list, and backups/restore) -- and there's intentionally no in-app button
 * to grant it to yourself, so it has to be set this way once.
 *
 * Run with:
 *   npx tsx src/scripts/grant-owner.ts you@example.com
 *   npx tsx src/scripts/grant-owner.ts you@example.com --revoke
 */

import { adminDb } from "../lib/firebaseAdmin";

async function main() {
    const email = process.argv[2];
    const revoke = process.argv.includes("--revoke");

    if (!email) {
        console.error("Usage: npx tsx src/scripts/grant-owner.ts <email> [--revoke]");
        process.exit(1);
    }

    const snap = await adminDb.collection("users").where("email", "==", email.toLowerCase().trim()).limit(1).get();
    if (snap.empty) {
        console.error(`No user found with email: ${email}`);
        process.exit(1);
    }

    const doc = snap.docs[0];
    await doc.ref.update({ isSuperAdmin: !revoke });
    console.log(`${revoke ? "Revoked" : "Granted"} platform Owner access for ${email}.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
