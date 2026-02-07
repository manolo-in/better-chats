import { publicProcedure } from "./procedure.ts";

export const testRouter = {
	test: {
		user: publicProcedure
			.route({ method: "GET" })
			.meta({
				permission: "user",
			})
			.handler(({ input }) => {
				return "Hi Man";
			}),
		system: publicProcedure
			.route({ method: "GET" })
			.meta({
				permission: "system",
			})
			.handler(({ input }) => {
				return "Hi Man";
			}),
	},
};
