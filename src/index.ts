import {
	type AnyRouter,
	createRouterClient,
	onError,
	type RouterClient,
} from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { anonymousRouter, anonymousSystemRouter } from "./api/anonymous.ts";
import { groupRoutes, groupSystemRoutes } from "./api/group.ts";
import { testRouter } from "./api/index.ts";
import { publicProcedure, userProcedure } from "./api/procedure.ts";
import { convertToDefault, convertToDefaultSystem } from "./tools.ts";
import type { UserCheck, UserData } from "./type.ts";

const userRoutes = {
	test: {
		browser: testRouter.browser,
		user: testRouter.user,
	},
	group: groupRoutes,
	anonymous: anonymousRouter,
};

const systemRoutes = {
	test: {
		system: testRouter.system,
	},
	group: groupSystemRoutes,
	anonymous: anonymousSystemRouter,
};

export const betterChat = <UD extends UserData, AR extends AnyRouter>(
	props: {
		/**
		 * To validate the user before processing the request.
		 */
		userCheck?: UserCheck<UD>;
		/**
		 * To add more custom APIs.
		 */
		extend?: (
			/**
			 * oRPC procedures to create custom API routes.
			 */
			procedures: {
				userProcedure: typeof userProcedure;
				publicProcedure: typeof publicProcedure;
			},
			/**
			 * System API client to call internal APIs within custom handlers.
			 */
			s_api: RouterClient<typeof systemRoutes>,
			/**
			 * User API client to call user APIs within custom handlers.
			 *
			 */
			u_api: typeof userRoutes,
		) => AR;
	} & Parameters<typeof convertToDefault>[0] &
		Parameters<typeof convertToDefaultSystem>[0],
) => {
	const { basePath, api: apiSelection } = convertToDefaultSystem(props);
	const { storage, tools, hooks } = convertToDefault(props);

	Object.entries(apiSelection).forEach((e) => {
		const [key, value] = e;
		if (!value && key in userRoutes) {
			delete userRoutes[key];
		}
	});

	const systemAPI = createRouterClient(systemRoutes, {
		interceptors: [onError(tools.onError)],
		context: {
			system: true,
			storage,
			tools,
			hooks,
		},
	});

	const extendedRoutes = {
		...userRoutes,
		...(props.extend
			? {
					extra: props.extend(
						{ userProcedure, publicProcedure },
						systemAPI,
						userRoutes,
					),
				}
			: {}),
	};

	return {
		$type: {} as Required<typeof extendedRoutes>,
		api: systemAPI,
		handler: async (raw: Request, user?: UD) => {
			const handler = new RPCHandler(extendedRoutes, {
				interceptors: [onError(tools.onError)],
			});

			const { matched, response } = await handler.handle(raw, {
				prefix: basePath,
				context: {
					user,
					userCheck: props.userCheck as UserCheck,
					storage,
					tools,
					hooks,
				},
			});

			if (matched) {
				return response;
			}

			return new Response("Not Found", { status: 404 });
		},
	};
};
