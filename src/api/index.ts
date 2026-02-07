import { getProcedure } from "./procedure.ts";

export const appRouter = {
	okay: getProcedure("user")
		.route({ method: "GET" })
		.handler((c): "OK" => {
			return "OK";
		}),
};
export type AppRouter = typeof appRouter;
