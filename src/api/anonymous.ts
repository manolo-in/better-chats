import z from "zod";
import { getError } from "@/error.ts";
import type { CoreAnonymousData, Permission, WhoCanDo } from "@/type.ts";
import { createHooks } from "@/utils.ts";
import { protectedProcedure } from "./procedure.ts";

export const createAnonymousRouter = (
	permission: Permission<WhoCanDo>["anonymous"],
) =>
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
				const data = await context.storage.read<CoreAnonymousData>(input.id);

				if (!context.system) {
					const userId = context.user?.id;

					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					// User must be one of the chat participants
					if (userId !== data.visibleUser && userId !== data.anonymousUser) {
						throw getError(
							"UNAUTHORIZED",
							"Only chat participants can access this chat",
						);
					}

					// Hide anonymousUser identity from visibleUser
					if (userId === data.visibleUser) {
						return {
							...data,
							anonymousUser: "anonymous",
						};
					}
				}

				return data;
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
				const mid = context.tools.getMessageDocId(input.id);

				if (context.system) {
					return await context.storage.getMessages(mid);
				}

				const data = await context.storage.read<CoreAnonymousData>(input.id);
				const userId = context.user?.id;

				if (!userId)
					throw getError(
						"UNAUTHORIZED",
						"You are not authorized to access this action",
					);

				if (userId !== data.visibleUser && userId !== data.anonymousUser) {
					throw getError(
						"UNAUTHORIZED",
						"Only chat participants can read messages",
					);
				}

				const messages = await context.storage.getMessages(mid);

				if (userId === data.visibleUser) {
					return messages.map((msg) =>
						msg.from === data.anonymousUser
							? { ...msg, from: "anonymous" }
							: msg,
					);
				}

				return messages;
			}),

		clearMessages: protectedProcedure
			.meta({
				permission: permission.clearMessages,
			})
			.input(
				z.object({
					id: z.string(),
				}),
			)
			.handler(async ({ context, input }) => {
				const mid = context.tools.getMessageDocId(input.id);

				if (context.system) {
					await context.storage.clearMessages(mid);
					return { success: true };
				}

				const data = await context.storage.read<CoreAnonymousData>(input.id);
				const userId = context.user?.id;

				if (!userId)
					throw getError(
						"UNAUTHORIZED",
						"You are not authorized to access this action",
					);

				if (userId !== data.visibleUser && userId !== data.anonymousUser) {
					throw getError(
						"UNAUTHORIZED",
						"You are not authorized to access this action",
					);
				}

				await context.storage.clearMessages(mid);
				return { success: true };
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
				const mid = context.tools.getMessageDocId(input.id);

				const chatData = await context.storage.read<CoreAnonymousData>(
					input.id,
				);

				const newMessage = {
					id: context.tools.generateMessageId(),
					data: input.data,
				};

				let from: string;

				if (!context.system) {
					const userId = context.user?.id;

					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					if (
						userId !== chatData.visibleUser &&
						userId !== chatData.anonymousUser
					) {
						throw getError(
							"UNAUTHORIZED",
							"Only chat participants can send messages",
						);
					}

					from = userId;
				} else {
					if (!input.user)
						throw getError("FORBIDDEN", "User ID is not provided");

					from = input.user;
				}

				await context.storage.appendMessage(mid, { ...newMessage, from });

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
				const mid = context.tools.getMessageDocId(input.id);

				if (context.system) {
					await context.storage.deleteMessage(mid, input.messageId);
					return { success: true };
				}

				const data = await context.storage.read<CoreAnonymousData>(input.id);
				const userId = context.user?.id;

				if (!userId)
					throw getError(
						"UNAUTHORIZED",
						"You are not authorized to access this action",
					);

				if (userId !== data.visibleUser && userId !== data.anonymousUser) {
					throw getError(
						"UNAUTHORIZED",
						"Only the chat participants can delete messages",
					);
				}

				await context.storage.deleteMessage(mid, input.messageId);
				return { success: true };
			}),
	}) satisfies Permission<any>["anonymous"];
