import { ORPCError, type ORPCErrorCode } from "@orpc/client";
import { trys } from "./utils.ts";

export const getError = (
	code: ORPCErrorCode = "INTERNAL_SERVER_ERROR",
	message?: string,
	cause?: unknown,
) => {
	return new ORPCError(code, {
		message: message ?? "Something wrong",
		cause,
	});
};

export const hookRunner = async <T>(
	x: Promise<T>,
	tag?: string,
	throwError?: boolean,
) => {
	const [error, data] = await trys(x);

	if (data) return;

	console.error(`Error in '${tag}' hook:`, error);
	if (throwError)
		throw getError(
			"PRECONDITION_FAILED",
			error?.message ?? `Precondition failed in before hook`,
		);
};
