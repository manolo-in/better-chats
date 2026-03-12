import { publicProcedure } from "./procedure.ts";

export const testRouter = {
	test: {
		user: publicProcedure
			.route({ method: "GET" })
			.meta({
				permission: "user",
			})
			.handler(({ input }) => {
				return "Only users can see this";
			}),
		system: publicProcedure
			.route({ method: "GET" })
			.meta({
				permission: "system",
			})
			.handler(({ input }) => {
				return "Only system can see this";
			}),
	},
};
