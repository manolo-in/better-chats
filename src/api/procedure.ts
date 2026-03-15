import { os } from "@orpc/server";
import { getError } from "@/error.ts";
import type { Context } from "@/type.ts";

export const orpc_os = os.$context<Context>();
export const publicProcedure = orpc_os;

const requireAuth = orpc_os.middleware(async ({ context, next }) => {
	if (context.system) return next();
	// return next({
	// 	context: {
	// 		user: undefined,
	// 		system: true,
	// 	},
	// });

	if (!context.user)
		throw getError(
			"UNAUTHORIZED",
			"You are not authorized to access this action",
		);

	return next({
		context: {
			user: context.user,
			system: false,
		},
	});
});

export const protectedProcedure = publicProcedure.use(requireAuth);
