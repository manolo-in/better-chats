import { createRouterClient, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createAnonymousRouter } from "./api/anonymous.ts";
import { createGroupRouter } from "./api/group.ts";
import { testRouter } from "./api/index.ts";
import { convertToDefault, convertToDefaultSystem } from "./tools.ts";
import type { APIs, UserCheck, UserData, WhoCanDo } from "./type.ts";

export const betterChat = <UD extends UserData>(
	props: {
		userCheck?: UserCheck<UD>;
	} & Parameters<typeof convertToDefault>[0] &
		Parameters<typeof convertToDefaultSystem>[0],
) => {
	const { basePath, api: apiSelection } = convertToDefaultSystem(props);
	const { storage, tools, permission, hooks } = convertToDefault(props);

	const apiRouter = {
		...testRouter,
		group: createGroupRouter(permission.group),
		anonymous: createAnonymousRouter(permission.anonymous),
	} satisfies Partial<APIs>;

	Object.entries(apiSelection).forEach((e) => {
		const [key, value] = e;
		if (!value && key in apiRouter) {
			delete apiRouter[key];
		}
	});

	const systemAPI = createRouterClient(apiRouter, {
		context: {
			system: true,
			user: undefined,
			storage,
			tools,
			hooks,
			permission,
		},
	});

	return {
		$type: {} as typeof apiRouter,
		api: systemAPI,
		handler: async (raw: Request, user: UD) => {
			try {
				if (props.userCheck) await props.userCheck(user);
			} catch (error) {
				console.error("User check failed:", error);
				return new Response("Unauthorized", { status: 401 });
			}

			const handler = new RPCHandler(apiRouter, {
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
