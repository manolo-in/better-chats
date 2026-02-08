import { ORPCError, type ORPCErrorCode } from "@orpc/client";

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
