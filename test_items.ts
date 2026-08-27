import { adminDb } from "./src/server/firebase-admin";

async function run() {
  const orgId = "someOrgId"; // We don't have the real orgId easily, but let's see if we can just get all items
  const snap = await adminDb.collection("inventoryItems").get();
  console.log(`Found ${snap.size} items in Firestore globally.`);
  
  const ids = new Set();
  const names = new Set();
  let dupIds = 0;
  let dupNames = 0;
  
  snap.docs.forEach(doc => {
    if (ids.has(doc.id)) dupIds++;
    ids.add(doc.id);
    
    const name = doc.data().name;
    if (names.has(name)) {
      dupNames++;
      console.log(`Duplicate name found: ${name}`);
    }
    names.add(name);
  });
  
  console.log(`Duplicate IDs: ${dupIds}`);
  console.log(`Duplicate Names: ${dupNames}`);
}
run();
