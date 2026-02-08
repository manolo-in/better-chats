import z from "zod";
import { getError } from "@/error.ts";
import type { CoreGroupData, Permission, WhoCanDo } from "@/type.ts";
import { publicProcedure } from "./procedure.ts";

export const createGroupRouter = (permission: Permission<WhoCanDo>["group"]) =>
	({
		get: publicProcedure
			.meta({
				permission: permission.get,
			})
			.input(
				z.object({
					id: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const data = await context.storage.read(input.id);
				return data;
			}),

		create: publicProcedure
			.meta({
				permission: permission.create,
			})
			.input(
				z.object({
					id: z.string().optional(),
					owner: z.string(),
					members: z.array(z.string()),
					data: z.record(z.string(), z.any()).optional(),
				}),
			)
			.handler(async ({ context, input }) => {
				const id = input.id ?? context.tools.generateId();
				const docId = context.tools.generateDocId(id);

				const coreData = {
					id,
					owner: input.owner,
					members: input.members,
					admins: [input.owner],
					createdAt: Date.now(),
					updatedAt: Date.now(),
				} satisfies CoreGroupData;

				await context.storage.write<CoreGroupData>(id, coreData);
				await context.storage.writeDoc(docId, input.data);

				return { ...coreData, data: input.data };
			}),

		update: publicProcedure
			.meta({
				permission: permission.update,
			})
			.input(
				z.object({
					id: z.string(),
					adminId: z.string(),
					data: z.record(z.string(), z.any()),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const admins = groupData.admins ?? [groupData.owner];

				if (!admins.includes(input.adminId)) {
					throw getError("UNAUTHORIZED", "Only admins can update group data");
				}

				const docId = context.tools.generateDocId(input.id);

				return await context.storage.updateDoc(docId, input.data);
			}),

		delete: publicProcedure
			.meta({
				permission: permission.delete,
			})
			.input(
				z.object({
					id: z.string(),
					adminId: z.string(),
					data: z.record(z.string(), z.any()),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);

				if (groupData.owner !== input.adminId) {
					throw getError("UNAUTHORIZED", "Only owner can delete group");
				}

				const id = input.id;
				const docId = context.tools.generateDocId(id);

				await context.storage.deleteDoc(docId);
				await context.storage.delete(id);
			}),

		join: publicProcedure
			.meta({
				permission: permission.join,
			})
			.input(
				z.object({
					id: z.string(),
					userId: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const updatedMembers = [
					...new Set([...groupData.members, input.userId]),
				];

				return await context.storage.update(input.id, {
					members: updatedMembers,
					updatedAt: Date.now(),
				});
			}),

		leave: publicProcedure
			.meta({
				permission: permission.leave,
			})
			.input(
				z.object({
					id: z.string(),
					userId: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const updatedMembers = groupData.members.filter(
					(id: string) => id !== input.userId,
				);

				return await context.storage.update(input.id, {
					members: updatedMembers,
					updatedAt: Date.now(),
				});
			}),

		getMembers: publicProcedure
			.meta({
				permission: permission.getMembers,
			})
			.input(
				z.object({
					id: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				return groupData.members;
			}),

		addMembers: publicProcedure
			.meta({
				permission: permission.addMembers,
			})
			.input(
				z.object({
					id: z.string(),
					adminId: z.string(),
					userIds: z.array(z.string()),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const admins = groupData.admins ?? [groupData.owner];

				if (!admins.includes(input.adminId)) {
					throw getError("UNAUTHORIZED", "Only admins can add members");
				}

				const updatedMembers = [
					...new Set([...groupData.members, ...input.userIds]),
				];

				return await context.storage.update(input.id, {
					members: updatedMembers,
					updatedAt: Date.now(),
				});
			}),

		removeMembers: publicProcedure
			.meta({
				permission: permission.removeMembers,
			})
			.input(
				z.object({
					id: z.string(),
					adminId: z.string(),
					userIds: z.array(z.string()),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const admins = groupData.admins ?? [groupData.owner];

				if (!admins.includes(input.adminId)) {
					throw getError("UNAUTHORIZED", "Only admins can remove members");
				}

				const userIdsSet = new Set(input.userIds);
				const updatedMembers = groupData.members.filter(
					(id: string) => !userIdsSet.has(id),
				);

				return await context.storage.update(input.id, {
					members: updatedMembers,
					updatedAt: Date.now(),
				});
			}),

		makeAdmin: publicProcedure
			.meta({
				permission: permission.makeAdmin,
			})
			.input(
				z.object({
					id: z.string(),
					currentAdminId: z.string(),
					userId: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const admins = groupData.admins ?? [];

				if (groupData.owner !== input.currentAdminId) {
					throw getError("UNAUTHORIZED", "Only owner can promote admins");
				}

				const updatedAdmins = [...new Set([...admins, input.userId])];

				return await context.storage.update(input.id, {
					admins: updatedAdmins,
					updatedAt: Date.now(),
				});
			}),

		removeAdmin: publicProcedure
			.meta({
				permission: permission.removeAdmin,
			})
			.input(
				z.object({
					id: z.string(),
					currentAdminId: z.string(),
					userId: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const admins = groupData.admins ?? [];

				if (groupData.owner !== input.currentAdminId) {
					throw getError("UNAUTHORIZED", "Only owner can demote admins");
				}

				const updatedAdmins = admins.filter(
					(id: string) => id !== input.userId,
				);

				return await context.storage.update(input.id, {
					admins: updatedAdmins,
					updatedAt: Date.now(),
				});
			}),

		getMessages: publicProcedure
			.meta({
				permission: permission.getMessages,
			})
			.input(
				z.object({
					id: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				return await context.storage.getMessages(input.id);
			}),

		appendMessage: publicProcedure
			.meta({
				permission: permission.appendMessage,
			})
			.input(
				z.object({
					id: z.string(),
					userId: z.string(),
					data: z.record(z.string(), z.any()),
				}),
			)
			.handler(async ({ context, input }) => {
				const newMessage = {
					id: context.tools.generateId(),
					from: input.userId,
					data: input.data,
				};

				await context.storage.appendMessage(input.id, newMessage);

				return newMessage;
			}),

		deleteMessage: publicProcedure
			.meta({
				permission: permission.deleteMessage,
			})
			.input(
				z.object({
					id: z.string(),
					adminId: z.string(),
					messageId: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const groupData = await context.storage.read<CoreGroupData>(input.id);
				const admins = groupData.admins ?? [groupData.owner];

				if (!admins.includes(input.adminId)) {
					throw getError("UNAUTHORIZED", "Only admins can delete messages");
				}

				await context.storage.deleteMessage(input.id, input.messageId);
			}),
	}) satisfies Permission<any>["group"];
