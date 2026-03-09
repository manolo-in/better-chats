import type * as ORPC from "@orpc/server";

import { createRouterClient, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createAnonymousRouter } from "./api/anonymous.ts";
import { createGroupRouter } from "./api/group.ts";
import { testRouter } from "./api/index.ts";
import { convertToDefault, convertToDefaultSystem } from "./tools.ts";
import type {
	GroupData,
	HookFunction,
	Permission,
	UserData,
	WhoCanDo,
} from "./type.ts";

export const betterChat = <UD extends UserData>(
	props: {
		// hooks: {
		// 	before: HookFunction<UD>;
		// 	after: HookFunction<UD, GroupData>;
		// };
	} & Parameters<typeof convertToDefault>[0] &
		Parameters<typeof convertToDefaultSystem>[0],
) => {
	const { basePath } = convertToDefaultSystem(props);
	const { storage, tools, permission } = convertToDefault(props);

	const apiRouter = {
		...testRouter,
		group: createGroupRouter(permission.group),
		anonymous: createAnonymousRouter(permission.anonymous),
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
				prefix: basePath,
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
