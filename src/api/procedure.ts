import { os } from "@orpc/server";
import { getError } from "@/error.ts";
import type { Context } from "@/type.ts";

export const orpc_os = os.$context<Context>();

import { ORPCError, onError, ValidationError } from "@orpc/server";
import z from "zod/v4";

const base = orpc_os.use(
	onError((error) => {
		if (
			error instanceof ORPCError &&
			error.code === "BAD_REQUEST" &&
			error.cause instanceof ValidationError
		) {
			// If you only use Zod you can safely cast to ZodIssue[]
			const zodError = new z.ZodError(error.cause.issues as z.core.$ZodIssue[]);

			throw new ORPCError("INPUT_VALIDATION_FAILED", {
				status: 422,
				message: z.prettifyError(zodError),
				data: z.flattenError(zodError),
				cause: error.cause,
			});
		}

		if (
			error instanceof ORPCError &&
			error.code === "INTERNAL_SERVER_ERROR" &&
			error.cause instanceof ValidationError
		) {
			throw new ORPCError("OUTPUT_VALIDATION_FAILED", {
				cause: error.cause,
			});
		}
	}),
);

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
