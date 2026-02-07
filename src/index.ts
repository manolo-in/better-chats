import { RPCHandler } from "@orpc/server/fetch";
import z from "zod";
import { getProcedure } from "./api/procedure.ts";
import type {
	Permission,
	StoragePlugin,
	UserCheckFunction,
	UserData,
	WhoCanDo,
} from "./type.ts";

const convertToDefault = (props: {
	tools?: {
		generateId?: () => string;
		generateDocId?: (id: string) => string;
	};
	storage: StoragePlugin;
}) => {
	return {
		...props,
		tools: {
			generateId: () => `1234567890`,
			generateDocId: (id: string) => `${id}_data`,
			...props.tools,
		},
	};
};

export const betterChat = <UD extends UserData>(
	props: {
		permission: Permission<WhoCanDo>;
		userCheck: UserCheckFunction;
	} & Parameters<typeof convertToDefault>[0],
) => {
	const { storage, tools } = convertToDefault(props);
	const { permission } = props;

	const apiRouter = {
		group: {
			get: getProcedure(permission.group.get)
				.route({ method: "GET" })
				.input(
					z.object({
						id: z.string(),
					}),
				)
				.handler(async ({ context, input }) => {
					const data = await storage.read(input.id);
					return data;
				}),

			create: getProcedure(permission.group.create)
				.route({ method: "GET" })
				.input(
					z.object({
						id: z.string().optional(),
						ownerId: z.string(),
						membersId: z.array(z.string()),
						data: z.record(z.string(), z.any()).optional(),
					}),
				)
				.handler(async ({ context, input }) => {
					const id = input.id ?? tools.generateId();
					const docId = tools.generateDocId(id);

					const coreData = {
						id,
						ownerId: input.ownerId,
						membersId: input.membersId,
						createdAt: Date.now(),
						updatedAt: Date.now(),
					};

					await storage.write(id, coreData);
					await storage.writeDoc(docId, input.data);

					return { ...coreData, data: input.data };
				}),

			update: getProcedure(permission.group.update)
				.route({ method: "GET" })
				.input(
					z.object({
						id: z.string(),
						adminId: z.string(),
						data: z.record(z.string(), z.any()),
					}),
				)
				.handler(async ({ context, input }) => {
					const id = input.id;
					const docId = tools.generateDocId(id);

					return await storage.updateDoc(docId, input.data);
				}),

			delete: getProcedure(permission.group.delete)
				.route({ method: "GET" })
				.input(
					z.object({
						id: z.string(),
						adminId: z.string(),
						data: z.record(z.string(), z.any()),
					}),
				)
				.handler(async ({ context, input }) => {
					const id = input.id;
					const docId = tools.generateDocId(id);

					await storage.deleteDoc(docId);
					await storage.delete(id);
				}),
		},
	} satisfies Permission<any>;

	return {
		api: apiRouter,
		handler: async (raw: Request, user: UD) => {
			const handler = new RPCHandler(apiRouter);

			const { matched, response } = await handler.handle(raw, {
				prefix: "/api/chat/",
				context: {
					user,
				},
			});

			if (matched) {
				return response;
			}

			return new Response("Not Found", { status: 404 });
		},
	};
};
