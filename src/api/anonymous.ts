import z from "zod";
import { getError } from "@/error.ts";
import type { Permission, WhoCanDo } from "@/type.ts";
import { protectedProcedure } from "./procedure.ts";

/**
 * Core data structure for anonymous chats
 * Both participants are known users, but one's identity is hidden from the other
 */
export type CoreAnonymousData = {
	id: string;
	visibleUser: string; // User who can see the anonymous user's identity
	anonymousUser: string; // User whose identity is hidden from visibleUser
	createdAt: number;
	updatedAt: number;
};

export const createAnonymousRouter = (
	permission: Permission<WhoCanDo>["anonymous"],
) =>
	({
		/**
		 * Get anonymous chat metadata
		 * visibleUser sees generic "anonymous" for the other participant
		 * anonymousUser sees normal user info
		 */
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

		/**
		 * Get all messages in an anonymous chat
		 * Both participants can read messages
		 * Messages from anonymousUser appear as from "anonymous"
		 */
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
				}

				const messages = await context.storage.getMessages(input.id);

				// Hide anonymousUser identity from visibleUser
				if (!context.system) {
					const data = await context.storage.read<CoreAnonymousData>(input.id);
					const userId = context.user?.id;

					if (userId === data.visibleUser) {
						return messages.map((msg) =>
							msg.from === data.anonymousUser
								? { ...msg, from: "anonymous" }
								: msg,
						);
					}
				}

				return messages;
			}),

		/**
		 * Clear all messages from an anonymous chat
		 * Only the visibleUser can clear messages
		 */
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
				const data = await context.storage.read<CoreAnonymousData>(input.id);

				if (!context.system) {
					const userId = context.user?.id;

					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					// Only visibleUser can clear messages
					if (userId !== data.visibleUser) {
						throw getError(
							"UNAUTHORIZED",
							"Only the visible user can clear messages",
						);
					}
				}

				const messages = await context.storage.getMessages(input.id);
				for (const message of messages) {
					await context.storage.deleteMessage(input.id, message.id);
				}

				return { success: true };
			}),

		/**
		 * Append a message to an anonymous chat
		 * Both participants can send messages
		 * For visibleUser, messages are stored as-is
		 * For anonymousUser, messages are stored with their ID
		 */
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

					// User must be one of the chat participants
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

				await context.storage.appendMessage(input.id, { ...newMessage, from });

				return newMessage;
			}),

		/**
		 * Delete a specific message from the anonymous chat
		 * Only the visibleUser can delete messages
		 */
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
					const data = await context.storage.read<CoreAnonymousData>(input.id);
					const userId = context.user?.id;

					if (!userId)
						throw getError(
							"UNAUTHORIZED",
							"You are not authorized to access this action",
						);

					// Only visibleUser can delete messages
					if (userId !== data.visibleUser) {
						throw getError(
							"UNAUTHORIZED",
							"Only the visible user can delete messages",
						);
					}
				}

				await context.storage.deleteMessage(input.id, input.messageId);
			}),
	}) satisfies Permission<any>["anonymous"];
