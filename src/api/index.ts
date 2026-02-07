import { publicProcedure } from "./procedure";

export const appRouter = {
	healthCheck: publicProcedure.handler((c): "OK" => {
		return "OK";
	}),
};
export type AppRouter = typeof appRouter;
