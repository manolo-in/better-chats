import z from "zod";
import { getError } from "@/error.ts";
import type { CoreGroupData, Permission, WhoCanDo } from "@/type.ts";
import { protectedProcedure } from "./procedure.ts";

export const createGroupRouter = (permission: Permission<WhoCanDo>["group"]) =>
	({
		get: protectedProcedure
			.meta({
				permission: permission.get,
			})
			.input(
				z.object({
					id: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const data = await context.storage.read<CoreGroupData>(input.id);

				if (!context.system) {
					const userId = context.user?.id;

					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					if (!data.members.includes(userId)) {
						throw getError(
							"UNAUTHORIZED",
							"Only authorized members can read group data",
						);
					}
				}

				return data;
			}),

		create: protectedProcedure
			.meta({
				permission: permission.create,
			})
			.input(
				z.object({
					id: z.string().optional(),
					owner: z.string().optional(),
					members: z.array(z.string()),
					data: z.record(z.string(), z.any()).optional(),
				}),
			)
			.handler(async ({ context, input }) => {
				const userId = context.system ? input.owner : context.user?.id;

				if (!userId)
					throw getError(
						"UNAUTHORIZED",
						context.system
							? "Owner ID is not provided"
							: "You are not authorized to access this action",
					);

				const id = input.id ?? context.tools.generateId();
				const docId = context.tools.generateDocId(id);

				const coreData = {
					id,
					owner: userId,
					members: [...new Set([...input.members, userId])],
					admins: [userId],
					createdAt: Date.now(),
					updatedAt: Date.now(),
				} satisfies CoreGroupData;

				await context.storage.write<CoreGroupData>(id, coreData);
				await context.storage.writeDoc(docId, input.data);

				return { ...coreData, data: input.data };
			}),

		update: protectedProcedure
			.meta({
				permission: permission.update,
			})
			.input(
				z.object({
					id: z.string(),
					admin: z.string().optional(),
					data: z.record(z.string(), z.any()),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const admins = groupData.admins ?? [groupData.owner];

				if (!context.system) {
					const userId = context.user?.id;

					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					if (!admins.includes(userId)) {
						throw getError("UNAUTHORIZED", "Only admins can update group data");
					}
				}

				const docId = context.tools.generateDocId(input.id);

				return await context.storage.updateDoc(docId, input.data);
			}),

		delete: protectedProcedure
			.meta({
				permission: permission.delete,
			})
			.input(
				z.object({
					id: z.string(),
					data: z.record(z.string(), z.any()),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);

				if (!context.system) {
					const userId = context.user?.id;
					if (groupData.owner !== userId) {
						throw getError("UNAUTHORIZED", "Only owner can delete group");
					}
				}

				const id = input.id;
				const docId = context.tools.generateDocId(id);

				await context.storage.deleteDoc(docId);
				await context.storage.delete(id);
			}),

		join: protectedProcedure
			.meta({
				permission: permission.join,
			})
			.input(
				z.object({
					id: z.string(),
					user: z.string().optional(),
				}),
			)
			.handler(async ({ context, input }) => {
				const userId = context.system ? input.user : context.user?.id;

				if (!userId)
					throw getError(
						"UNAUTHORIZED",
						context.system
							? "User ID is not provided"
							: "You are not authorized to access this action",
					);

				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const updatedMembers = [...new Set([...groupData.members, userId])];

				return await context.storage.update(input.id, {
					members: updatedMembers,
					updatedAt: Date.now(),
				});
			}),

		leave: protectedProcedure
			.meta({
				permission: permission.leave,
			})
			.input(
				z.object({
					id: z.string(),
					user: z.string().optional(),
				}),
			)
			.handler(async ({ context, input }) => {
				const userId = context.system ? input.user : context.user?.id;

				if (!userId)
					throw getError(
						"UNAUTHORIZED",
						context.system
							? "User ID is not provided"
							: "You are not authorized to access this action",
					);

				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const updatedMembers = groupData.members.filter(
					(id: string) => id !== userId,
				);

				return await context.storage.update(input.id, {
					members: updatedMembers,
					updatedAt: Date.now(),
				});
			}),

		getMembers: protectedProcedure
			.meta({
				permission: permission.getMembers,
			})
			.input(
				z.object({
					id: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const data = await context.storage.read<CoreGroupData>(input.id);

				if (!context.system) {
					const userId = context.user?.id;

					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					if (!data.members.includes(userId)) {
						throw getError(
							"UNAUTHORIZED",
							"Only authorized members can read group members data",
						);
					}
				}

				return data.members;
			}),

		addMembers: protectedProcedure
			.meta({
				permission: permission.addMembers,
			})
			.input(
				z.object({
					id: z.string(),
					users: z.array(z.string()),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const admins = groupData.admins ?? [groupData.owner];

				if (!context.system) {
					const userId = context.user?.id;
					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					if (!admins.includes(userId)) {
						throw getError("UNAUTHORIZED", "Only admins can add members");
					}
				}

				const updatedMembers = [
					...new Set([...groupData.members, ...input.users]),
				];

				return await context.storage.update(input.id, {
					members: updatedMembers,
					updatedAt: Date.now(),
				});
			}),

		removeMembers: protectedProcedure
			.meta({
				permission: permission.removeMembers,
			})
			.input(
				z.object({
					id: z.string(),
					users: z.array(z.string()),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const admins = groupData.admins ?? [groupData.owner];

				if (!context.system) {
					const userId = context.user?.id;
					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);
					if (!admins.includes(userId)) {
						throw getError("UNAUTHORIZED", "Only admins can remove members");
					}
				}

				const userIdsSet = new Set(input.users);
				const updatedMembers = groupData.members.filter(
					(id: string) => !userIdsSet.has(id),
				);

				return await context.storage.update(input.id, {
					members: updatedMembers,
					updatedAt: Date.now(),
				});
			}),

		makeAdmin: protectedProcedure
			.meta({
				permission: permission.makeAdmin,
			})
			.input(
				z.object({
					id: z.string(),
					user: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const admins = groupData.admins ?? [];

				if (!context.system) {
					const userId = context.user?.id;
					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					if (groupData.owner !== userId) {
						throw getError("UNAUTHORIZED", "Only owner can promote admins");
					}
				}

				const updatedAdmins = [...new Set([...admins, input.user])];

				return await context.storage.update(input.id, {
					admins: updatedAdmins,
					updatedAt: Date.now(),
				});
			}),

		removeAdmin: protectedProcedure
			.meta({
				permission: permission.removeAdmin,
			})
			.input(
				z.object({
					id: z.string(),
					user: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const admins = groupData.admins ?? [];

				if (!context.system) {
					const userId = context.user?.id;
					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					if (groupData.owner !== userId) {
						throw getError("UNAUTHORIZED", "Only owner can demote admins");
					}
				}

				const updatedAdmins = admins.filter((id: string) => id !== input.user);

				return await context.storage.update(input.id, {
					admins: updatedAdmins,
					updatedAt: Date.now(),
				});
			}),

		getMessages: protectedProcedure
			.meta({
				permission: permission.getMessages,
			})
			.input(
				z.object({
					id: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				if (!context.system) {
					const data = await context.storage.read<CoreGroupData>(input.id);
					const userId = context.user?.id;

					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					if (!data.members.includes(userId)) {
						throw getError(
							"UNAUTHORIZED",
							"Only authorized members can read group data",
						);
					}
				}

				return await context.storage.getMessages(input.id);
			}),

		appendMessage: protectedProcedure
			.meta({
				permission: permission.appendMessage,
			})
			.input(
				z.object({
					id: z.string(),
					user: z.string().optional(),
					data: z.record(z.string(), z.any()),
				}),
			)
			.handler(async ({ context, input }) => {
				const newMessage = {
					id: context.tools.generateMessageId(),
					data: input.data,
				};

				let from: string;

				if (!context.system) {
					const data = await context.storage.read<CoreGroupData>(input.id);
					const userId = context.user?.id;

					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					if (!data.members.includes(userId)) {
						throw getError(
							"UNAUTHORIZED",
							"Only authorized members can message in group",
						);
					}

					from = userId;
				} else {
					if (!input.user)
						throw getError("FORBIDDEN", "User ID is not provided");

					from = input.user;
				}

				await context.storage.appendMessage(input.id, { ...newMessage, from });

				return newMessage;
			}),

		deleteMessage: protectedProcedure
			.meta({
				permission: permission.deleteMessage,
			})
			.input(
				z.object({
					id: z.string(),
					messageId: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				if (!context.system) {
					const data = await context.storage.read<CoreGroupData>(input.id);
					const userId = context.user?.id;

					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					if (!data.members.includes(userId)) {
						throw getError(
							"UNAUTHORIZED",
							"Only authorized members can message in group",
						);
					}
				}

				await context.storage.deleteMessage(input.id, input.messageId);
			}),
	}) satisfies Permission<any>["group"];
