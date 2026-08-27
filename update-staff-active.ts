import { adminDb } from "./src/lib/firebaseAdmin";

async function main() {
    const snap = await adminDb.collection("users").get();
    let count = 0;
    for (const doc of snap.docs) {
        const data = doc.data();
        if (data.isActive === undefined) {
            await doc.ref.update({ isActive: true, emailVerified: true });
            count++;
        }
    }
    console.log("Updated", count, "users to isActive: true");
}

main().catch(console.error);
