import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const doctorsRouter = router({
    list: protectedProcedure.query(({ ctx }) => {
        return ctx.db.doctor.findMany({
            where: { organizationId: ctx.user.organizationId },
            orderBy: { name: "asc" },
        });
    }),
    create: protectedProcedure
        .input(z.object({ name: z.string().min(1) }))
        .mutation(({ ctx, input }) => {
            return ctx.db.doctor.create({
                data: {
                    name: input.name,
                    organizationId: ctx.user.organizationId,
                },
            });
        }),
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.db.doctor.delete({
                where: { id: input.id },
            });
        }),
});
