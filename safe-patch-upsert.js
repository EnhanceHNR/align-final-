const fs = require('fs');
let code = fs.readFileSync('src/server/routers/attendance.router.ts', 'utf8');

const startIdx = code.indexOf('upsertAttendance: protectedProcedure');
const endIdx = code.indexOf('}),', startIdx) + 3;

const oldUpsert = code.substring(startIdx, endIdx);

const newUpsert = `upsertAttendance: protectedProcedure
    .input(z.object({
      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
      punchInTime: z.string().optional(),
      punchOutTime: z.string().optional(),
      notes: z.string().optional(),
      clockInPhoto: z.string().optional(),
      clockOutPhoto: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      targetDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const snap = await adminDb
        .collection('attendances')
        .where('organizationId', '==', ctx.user.organizationId)
        .where('employeeProfileId', '==', input.employeeProfileId)
        .where('date', '>=', startOfDay)
        .where('date', '<=', endOfDay)
        .limit(1)
        .get();

      let attendanceId = null;
      if (!snap.empty) {
        attendanceId = snap.docs[0].id;
        await adminDb.collection('attendances').doc(attendanceId).update({ 
            status: input.status,
            notes: input.notes || null,
        });
      } else {
        const ref = adminDb.collection('attendances').doc();
        const data = {
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: targetDate,
          status: input.status,
          notes: input.notes || null,
        };
        await ref.set(data);
        attendanceId = ref.id;
      }
      
      // Upsert the session
      const sessionsSnap = await adminDb
        .collection('attendanceSessions')
        .where('attendanceId', '==', attendanceId)
        .limit(1)
        .get();
        
      const pIn = input.punchInTime ? new Date(input.punchInTime) : null;
      const pOut = input.punchOutTime ? new Date(input.punchOutTime) : null;
      
      let duration = null;
      if (pIn && pOut) {
         const diffMs = pOut.getTime() - pIn.getTime();
         const diffHrs = Math.floor(diffMs / 3600000);
         const diffMins = Math.floor((diffMs % 3600000) / 60000);
         duration = \`\${diffHrs}h \${diffMins}m\`;
      }

      if (!sessionsSnap.empty) {
          const sId = sessionsSnap.docs[0].id;
          const updates = {};
          if (pIn) updates.clockInTime = pIn;
          if (pOut) updates.clockOutTime = pOut;
          if (duration) updates.duration = duration;
          if (input.clockInPhoto) updates.clockInPhoto = input.clockInPhoto;
          if (input.clockOutPhoto) updates.clockOutPhoto = input.clockOutPhoto;
          
          if (Object.keys(updates).length > 0) {
              await adminDb.collection('attendanceSessions').doc(sId).update(updates);
          }
      } else if (pIn || pOut || input.clockInPhoto || input.clockOutPhoto) {
          await adminDb.collection('attendanceSessions').add({
              attendanceId,
              organizationId: ctx.user.organizationId,
              clockInTime: pIn || new Date(),
              clockOutTime: pOut || null,
              duration,
              clockInPhoto: input.clockInPhoto || null,
              clockOutPhoto: input.clockOutPhoto || null,
          });
      }
      
      return { success: true };
    }),`;

code = code.replace(oldUpsert, newUpsert);
fs.writeFileSync('src/server/routers/attendance.router.ts', code);
