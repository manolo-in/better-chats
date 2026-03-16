import { os } from "@orpc/server";
import { getError } from "@/error.ts";
import type { Context } from "@/type.ts";

export const orpc_os = os.$context<Context>();
export const publicProcedure = orpc_os;

const userAuth = orpc_os.middleware(async ({ context, next }) => {
	if (!context.user)
		throw getError(
			"UNAUTHORIZED",
			"You are not authorized to access this action",
		);

	try {
		if (context.userCheck) await context.userCheck(context.user);
	} catch (error) {
		throw getError(
			"UNAUTHORIZED",
			"You are not authorized to access this action",
		);
	}

	return next({
		context: {
			user: context.user,
			system: false,
		},
	});
});

export const userProcedure = publicProcedure.use(userAuth);

const systemAuth = orpc_os.middleware(async ({ context, next }) => {
	if (context.system)
		return next({
			context: {
				user: undefined,
				system: true,
			},
		});

	throw getError(
		"UNAUTHORIZED",
		"You are not authorized to access this action",
	);
});

export const systemProcedure = publicProcedure.use(systemAuth);
