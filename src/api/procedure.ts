import { os } from "@orpc/server";
import type {
	Context,
	PermissionStrings,
	UserData,
	WhoCanDo,
} from "../type.ts";

export const o = os.$context<Context>();

const user = o;

const requireAuth = o.middleware(async ({ context, next }) => {
	if (false)
		throw getError(
			"UNAUTHORIZED",
			"You are not authorized to access this action",
		);

	return next({
		context: {
			system: true,
		},
	});
});

const system = user.use(requireAuth);

export const getProcedure = (x: WhoCanDo) => {
	switch (x) {
		case "user":
			return user;
		case "system":
			return system;
		default:
			return system;
	}
};
