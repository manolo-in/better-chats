import {
	type AnyRouter,
	createRouterClient,
	onError,
	type RouterClient,
} from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createAnonymousRouter } from "./api/anonymous.ts";
import { createGroupRouter } from "./api/group.ts";
import { testRouter } from "./api/index.ts";
import { protectedProcedure } from "./api/procedure.ts";
import { convertToDefault, convertToDefaultSystem } from "./tools.ts";
import type { UserCheck, UserData, WhoCanDo } from "./type.ts";

type BaseAPIs = {
	group: ReturnType<typeof createGroupRouter>;
	anonymous: ReturnType<typeof createAnonymousRouter>;
} & typeof testRouter;

export const betterChat = <UD extends UserData, AR extends AnyRouter>({
	extraAPIs,
	...props
}: {
	/**
	 * To validate the user before processing the request.
	 */
	userCheck?: UserCheck<UD>;
	/**
	 * To add more custom APIs.
	 */
	extraAPIs?: (
		procedure: typeof protectedProcedure,
		api: RouterClient<BaseAPIs>,
	) => AR;
} & Parameters<typeof convertToDefault>[0] &
	Parameters<typeof convertToDefaultSystem>[0]) => {
	const { basePath, api: apiSelection } = convertToDefaultSystem(props);
	const { storage, tools, permission, hooks } = convertToDefault(props);
	const baseAPIs = {
		...testRouter,
		group: createGroupRouter(permission.group),
		anonymous: createAnonymousRouter(permission.anonymous),
	} satisfies BaseAPIs;

	Object.entries(apiSelection).forEach((e) => {
		const [key, value] = e;
		if (!value && key in baseAPIs) {
			delete baseAPIs[key];
		}
	});

	const systemAPI = createRouterClient(baseAPIs, {
		interceptors: [onError(tools.onError)],
		context: {
			system: true,
			user: undefined,
			storage,
			tools,
			hooks,
			permission,
		},
	});

	const extendedAPI = {
		...baseAPIs,
		...(extraAPIs ? { extra: extraAPIs(protectedProcedure, systemAPI) } : {}),
	} satisfies BaseAPIs & {
		extra?: AnyRouter;
	};

	return {
		$type: {} as Required<typeof extendedAPI>,
		api: systemAPI,
		handler: async (raw: Request, user: UD) => {
			try {
				if (props.userCheck) await props.userCheck(user);
			} catch (error) {
				console.error("User check failed:", error);
				return new Response("Unauthorized", { status: 401 });
			}

			const handler = new RPCHandler(extendedAPI, {
				filter: ({ contract }) =>
					!((contract["~orpc"].meta.permission as WhoCanDo) === "system"),
				interceptors: [onError(tools.onError)],
			});

			const { matched, response } = await handler.handle(raw, {
				prefix: basePath,
				context: {
					user,
					system: false,
					storage,
					tools,
					hooks,
					permission,
				},
			});

			if (matched) {
				return response;
			}

			return new Response("Not Found", { status: 404 });
		},
	};
};
