import { RPCHandler } from "@orpc/server/fetch";
import z from "zod";
import { testRouter } from "./api/index.ts";
import { publicProcedure } from "./api/procedure.ts";
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
		...testRouter,
		group: {
			get: publicProcedure
				.meta({
					permission: permission.group.get,
				})
				.input(
					z.object({
						id: z.string(),
					}),
				)
				.handler(async ({ context, input }) => {
					const data = await storage.read(input.id);
					return data;
				}),

			create: publicProcedure
				.meta({
					permission: permission.group.create,
				})
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

			update: publicProcedure
				.meta({
					permission: permission.group.update,
				})
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

			delete: publicProcedure
				.meta({
					permission: permission.group.delete,
				})
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
		$type: {} as typeof apiRouter,
		api: apiRouter,
		handler: async (raw: Request, user: UD) => {
			const handler = new RPCHandler(apiRouter, {
				filter: ({ contract }) =>
					!((contract["~orpc"].meta.permission as WhoCanDo) === "system"),
			});

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
