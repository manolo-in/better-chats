import z from "zod";
import { getError } from "@/error.ts";
import type { CoreGroupData, Permission, WhoCanDo } from "@/type.ts";
import { createHooks, trys } from "@/utils.ts";
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
				const { before, after } = createHooks(context.hooks, ["group", "get"]);
				await before();

				const [error, data] = await trys(
					context.storage.read<CoreGroupData>(input.id),
				);

				if (error) throw getError("NOT_FOUND", "Group not found");

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

				await after();
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"create",
				]);
				await before();

				const userId = context.system ? input.owner : context.user?.id;

				if (!userId)
					throw getError(
						"UNAUTHORIZED",
						context.system
							? "Owner ID is not provided"
							: "You are not authorized to access this action",
					);

				const id = input.id ?? context.tools.generateId();
				const docId = context.tools.getDocId(id);

				const coreData = {
					id,
					owner: userId,
					members: [...new Set([...input.members, userId])],
					admins: [userId],
					createdAt: Date.now(),
					updatedAt: Date.now(),
				} satisfies CoreGroupData;

				const [writeError] = await trys(
					context.storage.write<CoreGroupData>(id, coreData),
				);

				if (writeError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to create group");

				const [docError] = await trys(
					context.storage.writeDoc(docId, input.data),
				);

				if (docError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to create group");

				await after();
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"update",
				]);
				await before();

				const [readError, groupData] = await trys(
					context.storage.read<CoreGroupData>(input.id),
				);

				if (readError) throw getError("NOT_FOUND", "Group not found");

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

				const docId = context.tools.getDocId(input.id);

				const [updateError, result] = await trys(
					context.storage.updateDoc(docId, input.data),
				);

				if (updateError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to update group");

				await after();
				return result;
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"delete",
				]);
				await before();

				const [readError, groupData] = await trys(
					context.storage.read<CoreGroupData>(input.id),
				);

				if (readError) throw getError("NOT_FOUND", "Group not found");

				if (!context.system) {
					const userId = context.user?.id;
					if (groupData.owner !== userId) {
						throw getError("UNAUTHORIZED", "Only owner can delete group");
					}
				}

				const id = input.id;
				const docId = context.tools.getDocId(id);

				const [deleteDocError] = await trys(context.storage.deleteDoc(docId));

				if (deleteDocError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to delete group");

				const [deleteError] = await trys(context.storage.delete(id));

				if (deleteError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to delete group");

				await after();
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
				const { before, after } = createHooks(context.hooks, ["group", "join"]);
				await before();

				const userId = context.system ? input.user : context.user?.id;

				if (!userId)
					throw getError(
						"UNAUTHORIZED",
						context.system
							? "User ID is not provided"
							: "You are not authorized to access this action",
					);

				const [readError, groupData] = await trys(
					context.storage.read<CoreGroupData>(input.id),
				);

				if (readError) throw getError("NOT_FOUND", "Group not found");

				const updatedMembers = [...new Set([...groupData.members, userId])];

				const [updateError, result] = await trys(
					context.storage.update(input.id, {
						members: updatedMembers,
						updatedAt: Date.now(),
					}),
				);

				if (updateError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to join group");

				await after();
				return result;
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"leave",
				]);
				await before();

				const userId = context.system ? input.user : context.user?.id;

				if (!userId)
					throw getError(
						"UNAUTHORIZED",
						context.system
							? "User ID is not provided"
							: "You are not authorized to access this action",
					);

				const [readError, groupData] = await trys(
					context.storage.read<CoreGroupData>(input.id),
				);

				if (readError) throw getError("NOT_FOUND", "Group not found");

				const updatedMembers = groupData.members.filter(
					(id: string) => id !== userId,
				);

				const [updateError, result] = await trys(
					context.storage.update(input.id, {
						members: updatedMembers,
						updatedAt: Date.now(),
					}),
				);

				if (updateError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to leave group");

				await after();
				return result;
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"getMembers",
				]);
				await before();

				const [error, data] = await trys(
					context.storage.read<CoreGroupData>(input.id),
				);

				if (error) throw getError("NOT_FOUND", "Group not found");

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

				await after();
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"addMembers",
				]);
				await before();

				const [readError, groupData] = await trys(
					context.storage.read<CoreGroupData>(input.id),
				);

				if (readError) throw getError("NOT_FOUND", "Group not found");

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

				// Validate that all users being added are not null or empty
				const validUsers = input.users.filter(
					(user) => user && user.trim().length > 0,
				);
				if (validUsers.length === 0) {
					throw getError(
						"UNPROCESSABLE_ENTITY",
						"No valid users provided to add",
					);
				}

				const updatedMembers = [
					...new Set([...groupData.members, ...validUsers]),
				];

				const [updateError, result] = await trys(
					context.storage.update(input.id, {
						members: updatedMembers,
						updatedAt: Date.now(),
					}),
				);

				if (updateError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to add members");

				await after();
				return result;
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"removeMembers",
				]);
				await before();

				const [readError, groupData] = await trys(
					context.storage.read<CoreGroupData>(input.id),
				);

				if (readError) throw getError("NOT_FOUND", "Group not found");

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

				// Prevent removal of the group owner
				if (userIdsSet.has(groupData.owner)) {
					throw getError(
						"UNPROCESSABLE_ENTITY",
						"Cannot remove the group owner",
					);
				}

				const updatedMembers = groupData.members.filter(
					(id: string) => !userIdsSet.has(id),
				);

				const [updateError, result] = await trys(
					context.storage.update(input.id, {
						members: updatedMembers,
						updatedAt: Date.now(),
					}),
				);

				if (updateError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to remove members");

				await after();
				return result;
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"makeAdmin",
				]);
				await before();

				const [readError, groupData] = await trys(
					context.storage.read<CoreGroupData>(input.id),
				);

				if (readError) throw getError("NOT_FOUND", "Group not found");

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

				// Validate that the user to be promoted is a member of the group
				if (!groupData.members.includes(input.user)) {
					throw getError(
						"UNPROCESSABLE_ENTITY",
						"User must be a member of the group before becoming admin",
					);
				}

				const updatedAdmins = [...new Set([...admins, input.user])];

				const [updateError, result] = await trys(
					context.storage.update(input.id, {
						admins: updatedAdmins,
						updatedAt: Date.now(),
					}),
				);

				if (updateError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to make admin");

				await after();
				return result;
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"removeAdmin",
				]);
				await before();

				const [readError, groupData] = await trys(
					context.storage.read<CoreGroupData>(input.id),
				);

				if (readError) throw getError("NOT_FOUND", "Group not found");

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

				// Prevent removal if it would result in zero admins (except owner as fallback)
				if (updatedAdmins.length === 0) {
					throw getError(
						"UNPROCESSABLE_ENTITY",
						"Cannot remove the last admin from the group",
					);
				}

				const [updateError, result] = await trys(
					context.storage.update(input.id, {
						admins: updatedAdmins,
						updatedAt: Date.now(),
					}),
				);

				if (updateError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to remove admin");

				await after();
				return result;
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"getMessages",
				]);
				await before();

				const mid = context.tools.getMessageDocId(input.id);

				if (!context.system) {
					const [readError, data] = await trys(
						context.storage.read<CoreGroupData>(input.id),
					);

					if (readError) throw getError("NOT_FOUND", "Group not found");

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

				const [messagesError, messages] = await trys(
					context.storage.getMessages(mid),
				);

				if (messagesError) throw getError("NOT_FOUND", "Messages not found");

				await after();
				return messages;
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"appendMessage",
				]);
				await before();

				const mid = context.tools.getMessageDocId(input.id);

				const newMessage = {
					id: context.tools.generateMessageId(),
					data: input.data,
				};

				let from: string;

				if (!context.system) {
					const [readError, data] = await trys(
						context.storage.read<CoreGroupData>(input.id),
					);

					if (readError) throw getError("NOT_FOUND", "Group not found");

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

				const [appendError] = await trys(
					context.storage.appendMessage(mid, { ...newMessage, from }),
				);

				if (appendError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to append message");

				await after();
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
				const { before, after } = createHooks(context.hooks, [
					"group",
					"deleteMessage",
				]);
				await before();

				const mid = context.tools.getMessageDocId(input.id);

				if (!context.system) {
					const [readError, data] = await trys(
						context.storage.read<CoreGroupData>(input.id),
					);

					if (readError) throw getError("NOT_FOUND", "Group not found");

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

				const [deleteError] = await trys(
					context.storage.deleteMessage(mid, input.messageId),
				);

				if (deleteError)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to delete message");

				await after();
			}),
	}) satisfies Permission<any>["group"];
