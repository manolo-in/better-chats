import { createRouterClient, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createGroupRouter } from "./api/group.ts";
import { testRouter } from "./api/index.ts";
import { convertToDefault } from "./tools.ts";
import type {
	Permission,
	UserCheckFunction,
	UserData,
	WhoCanDo,
} from "./type.ts";

export const betterChat = <UD extends UserData>(
	props: {
		userCheck: UserCheckFunction;
	} & Parameters<typeof convertToDefault>[0],
) => {
	const { storage, tools, permission } = convertToDefault(props);

	const apiRouter = {
		...testRouter,
		group: createGroupRouter(permission.group),
	} satisfies Permission<any>;

	const api = createRouterClient(apiRouter, {
		context: {
			system: true,
			user: undefined,
			storage,
			tools,
			permission,
		},
	});

	return {
		$type: {} as typeof apiRouter,
		api,
		handler: async (raw: Request, user: UD) => {
			const handler = new RPCHandler(apiRouter, {
				filter: ({ contract }) =>
					!((contract["~orpc"].meta.permission as WhoCanDo) === "system"),
				interceptors: [onError(tools.onError)],
			});

			const { matched, response } = await handler.handle(raw, {
				prefix: "/api/chat/",
				context: {
					user,
					system: false,
					storage,
					tools,
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
