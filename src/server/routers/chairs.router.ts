import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const chairRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.chair.findMany({
      where: { organizationId: ctx.user.organizationId },
      orderBy: { createdAt: "asc" },
    });
  }),
  create: publicProcedure
    .input(z.object({ name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chair.create({
        data: {
          name: input.name,
          color: input.color ?? "#3b82f6",
        },
      });
    }),
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chair.deleteMany({
        where: { id: input.id, organizationId: ctx.user.organizationId },
      });
    }),
  updateGoogleCalendar: publicProcedure
    .input(z.object({
        id: z.string(),
        googleCalendarId: z.string().nullable(),
        googleSyncEnabled: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
        return ctx.db.chair.update({
            where: { id: input.id },
            data: {
                googleCalendarId: input.googleCalendarId,
                googleSyncEnabled: input.googleSyncEnabled
            }
        });
    }),
});
