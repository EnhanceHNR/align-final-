import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    // Using a simple secret in headers to secure the cron
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch Admin Emails
    const usersSnapshot = await adminDb.collection('users').where('role', '==', 'admin').get();
    const adminEmails = usersSnapshot.docs.map(doc => doc.data().email).filter(Boolean);

    if (adminEmails.length === 0) {
      return NextResponse.json({ success: true, message: 'No admin emails found' });
    }

    // 2. Fetch all send records (pending and active)
    const submissionsSnapshot = await adminDb.collection('submissions').where('type', '==', 'send').get();
    const upcomingDeliveries: any[] = [];
    
    // We can also fetch pending approvals if we want to remind them
    const pendingApprovals: any[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    submissionsSnapshot.docs.forEach(docSnap => {
      const sub = docSnap.data();
      
      // Check for pending approvals
      if (sub.approvalStatus === 'Pending') {
          pendingApprovals.push(sub);
      }
      
      // Check for upcoming deliveries (appointmentDate in next 3 days)
      if (sub.appointmentStatus === 'Appointment given' && sub.appointmentDate) {
          const appDate = new Date(sub.appointmentDate);
          if (appDate >= today && appDate <= threeDaysFromNow) {
              upcomingDeliveries.push(sub);
          }
      }
    });

    // 3. Generate Email if there's anything to report
    let emailsGenerated = 0;

    if (upcomingDeliveries.length > 0 || pendingApprovals.length > 0) {
      let html = `<h2>Daily Lab Tracking Report</h2>`;
      
      if (pendingApprovals.length > 0) {
        html += `<h3>Orders Pending Approval (${pendingApprovals.length})</h3><ul>`;
        pendingApprovals.forEach(sub => {
          html += `<li><b>${sub.patientName}</b> - ${sub.item} (${sub.labName}) - Sent by ${sub.senderName}</li>`;
        });
        html += `</ul>`;
      }

      if (upcomingDeliveries.length > 0) {
        html += `<h3>Deliveries / Appointments in Next 3 Days (${upcomingDeliveries.length})</h3><ul>`;
        upcomingDeliveries.forEach(sub => {
          html += `<li><b>${sub.patientName}</b> - ${sub.item} (${sub.labName}) - Date: ${new Date(sub.appointmentDate).toDateString()}</li>`;
        });
        html += `</ul>`;
      }

      await adminDb.collection('mail').add({
        to: adminEmails,
        message: {
          subject: 'Daily Alerts (Deliveries & Pending Approvals)',
          html
        }
      });
      emailsGenerated++;
    }

    return NextResponse.json({ success: true, emailsQueued: emailsGenerated });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
