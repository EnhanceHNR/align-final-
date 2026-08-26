const fs = require('fs');
let code = fs.readFileSync('src/server/routers/attendance.router.ts', 'utf8');

const oldInput = `      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
    }))`;

const newInput = `      employeeProfileId: z.string(),
      date: z.string(), // ISO date string
      status: z.string(),
      punchInTime: z.string().optional(),
      punchOutTime: z.string().optional(),
      notes: z.string().optional(),
    }))`;

code = code.replace(oldInput, newInput);

const oldMutation = `        await adminDb.collection('attendances').add({
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: targetDate,
          status: input.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        await snap.docs[0].ref.update({
          status: input.status,
          updatedAt: new Date(),
        });`;

const newMutation = `        await adminDb.collection('attendances').add({
          organizationId: ctx.user.organizationId,
          employeeProfileId: input.employeeProfileId,
          date: targetDate,
          status: input.status,
          punchInTime: input.punchInTime || null,
          punchOutTime: input.punchOutTime || null,
          notes: input.notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        await snap.docs[0].ref.update({
          status: input.status,
          ...(input.punchInTime !== undefined && { punchInTime: input.punchInTime }),
          ...(input.punchOutTime !== undefined && { punchOutTime: input.punchOutTime }),
          ...(input.notes !== undefined && { notes: input.notes }),
          updatedAt: new Date(),
        });`;

code = code.replace(oldMutation, newMutation);

fs.writeFileSync('src/server/routers/attendance.router.ts', code);
