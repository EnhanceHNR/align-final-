const fs = require('fs');
let code = fs.readFileSync('src/server/routers/employee.router.ts', 'utf8');

const oldInput = `        jobTitle: z.string().optional(),
        shifts: z.array(z.object({ id: z.string().optional(), startTime: z.string(), endTime: z.string() })).optional(),
      })
    )`;

const newInput = `        jobTitle: z.string().optional(),
        shifts: z.array(z.object({ id: z.string().optional(), startTime: z.string(), endTime: z.string() })).optional(),
        paidLeaveBalance: z.number().optional(),
        sickLeaveBalance: z.number().optional(),
        latePunchinBuffer: z.number().optional(),
        weeklyOffs: z.array(z.string()).optional(),
        salaryComponents: z.array(z.object({ name: z.string(), amount: z.number(), type: z.enum(['addition', 'deduction']) })).optional(),
        avatarUrl: z.string().optional(),
      })
    )`;

code = code.replace(oldInput, newInput);

const oldMutation = `        baseSalary: input.baseSalary,
        mobileNumber: input.mobileNumber,
        jobTitle: input.jobTitle,
        shifts: input.shifts,
        updatedAt: new Date(),
      };`;

const newMutation = `        baseSalary: input.baseSalary,
        mobileNumber: input.mobileNumber,
        jobTitle: input.jobTitle,
        shifts: input.shifts,
        paidLeaveBalance: input.paidLeaveBalance,
        sickLeaveBalance: input.sickLeaveBalance,
        latePunchinBuffer: input.latePunchinBuffer,
        weeklyOffs: input.weeklyOffs,
        salaryComponents: input.salaryComponents,
        avatarUrl: input.avatarUrl,
        updatedAt: new Date(),
      };`;

code = code.replace(oldMutation, newMutation);

fs.writeFileSync('src/server/routers/employee.router.ts', code);
