import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Ensure Firebase is initialized
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch Users (to find Admin emails)
    const usersSnapshot = await getDocs(collection(firestore, 'users'));
    const adminEmails = usersSnapshot.docs
      .map(d => d.data())
      .filter(u => u.role === 'Admin' && u.email)
      .map(u => u.email as string);

    if (adminEmails.length === 0) {
      return NextResponse.json({ success: true, message: 'No admin emails found' });
    }

    // 2. Fetch Items (for Low Stock and Expiry Checks)
    const itemsSnapshot = await getDocs(collection(firestore, 'items'));
    const lowStockItems: any[] = [];
    const expiringItems: any[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    itemsSnapshot.docs.forEach(docSnap => {
      const item = docSnap.data();
      
      // Low Stock Check
      if (item.itemCount <= item.minQuantity) {
        lowStockItems.push(item);
      }

      // Expiry Check (within 30 days)
      if (item.stock && Array.isArray(item.stock)) {
        item.stock.forEach((s: any) => {
          const expiryDate = new Date(s.expiryDate);
          if (expiryDate > today && expiryDate <= thirtyDaysFromNow) {
             expiringItems.push({ ...item, batchExpiry: s.expiryDate, batchQuantity: s.quantity });
          }
        });
      }
    });

    // 3. Fetch Orders (for ETA Check)
    const ordersSnapshot = await getDocs(collection(firestore, 'orderRecords'));
    const arrivingOrders: any[] = [];

    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    ordersSnapshot.docs.forEach(docSnap => {
      const order = docSnap.data();
      if (order.status === 'Pending' || order.status === 'Delayed') {
        if (order.estimatedArrival) {
          const eta = new Date(order.estimatedArrival);
          if (eta <= twoDaysFromNow) {
            arrivingOrders.push(order);
          }
        }
      }
    });

    // 4. Generate Emails
    const batch = writeBatch(firestore);
    let emailsGenerated = 0;

    if (lowStockItems.length > 0 || expiringItems.length > 0 || arrivingOrders.length > 0) {
      let html = `<h2>Daily Inventory Report</h2>`;
      
      if (lowStockItems.length > 0) {
        html += `<h3>Low Stock Alert (${lowStockItems.length} items)</h3><ul>`;
        lowStockItems.forEach(item => {
          html += `<li><b>${item.name}</b>: ${item.itemCount} remaining (Min: ${item.minQuantity})</li>`;
        });
        html += `</ul>`;
      }

      if (expiringItems.length > 0) {
        html += `<h3>Expiring Items in Next 30 Days (${expiringItems.length} batches)</h3><ul>`;
        expiringItems.forEach(item => {
          html += `<li><b>${item.name}</b>: Batch of ${item.batchQuantity} expires on ${item.batchExpiry}</li>`;
        });
        html += `</ul>`;
      }

      if (arrivingOrders.length > 0) {
        html += `<h3>Orders Arriving Soon (${arrivingOrders.length} orders)</h3><ul>`;
        arrivingOrders.forEach(order => {
          html += `<li><b>${order.itemName}</b> (Qty: ${order.quantity}) from ${order.dealer} ETA: ${new Date(order.estimatedArrival).toDateString()}</li>`;
        });
        html += `</ul>`;
      }

      const mailRef = doc(collection(firestore, 'mail'));
      batch.set(mailRef, {
        to: adminEmails,
        message: {
          subject: 'Daily Inventory Alerts (Low Stock, Expiry, Deliveries)',
          html
        }
      });
      emailsGenerated++;
    }

    if (emailsGenerated > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, emailsQueued: emailsGenerated });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
