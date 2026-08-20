import { router, protectedProcedure } from "../trpc";

export const historyRouter = router({
    getGlobalHistory: protectedProcedure.query(async ({ ctx }) => {
        const organizationId = ctx.user.organizationId;
        
        const appointments = await ctx.db.appointment.findMany({
            where: {
                patient: { organizationId },
                status: { in: ["COMPLETED", "CANCELLED"] }
            },
            include: {
                patient: { select: { id: true, fullName: true } }
            },
            orderBy: { startTime: 'desc' },
            take: 100
        });

        const treatments = await ctx.db.treatment.findMany({
            where: {
                patient: { organizationId },
                status: { in: ["COMPLETED", "INVOICED"] }
            },
            include: {
                patient: { select: { id: true, fullName: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return { appointments, treatments };
    })
});
