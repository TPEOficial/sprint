import { initTRPC } from "@trpc/server";
import { z } from "sprint-es/schemas";

const t = initTRPC.context<{ requestId?: string }>().create();

const users: { id: string; name: string }[] = [];

export const appRouter = t.router({
    hello: t.procedure
        .input(z.object({ name: z.string() }))
        .query(({ input }) => ({ greeting: `Hello, ${input.name}!`, ts: Date.now() })),

    listUsers: t.procedure
        .query(() => users),

    createUser: t.procedure
        .input(z.object({ name: z.string().min(1) }))
        .mutation(({ input, ctx }) => {
            const user = { id: crypto.randomUUID(), name: input.name };
            users.push(user);
            return { ...user, requestId: ctx.requestId };
        })
});

export type AppRouter = typeof appRouter;
