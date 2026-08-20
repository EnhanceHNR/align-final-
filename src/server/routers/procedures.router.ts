import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const proceduresRouter = router({
    list: protectedProcedure.query(({ ctx }) => {
        return ctx.db.procedure.findMany({
            where: { organizationId: ctx.user.organizationId },
            orderBy: { name: "asc" },
        });
    }),
    create: protectedProcedure
        .input(z.object({ name: z.string().min(1), duration: z.number().optional() }))
        .mutation(({ ctx, input }) => {
            return ctx.db.procedure.create({
                data: {
                    name: input.name,
                    duration: input.duration ?? 30,
                    organizationId: ctx.user.organizationId,
                },
            });
        }),
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return ctx.db.procedure.delete({
                where: { id: input.id },
            });
        }),
});
