import z from "zod";
import { getError } from "@/error.ts";
import type { CoreAnonymousData, Permission } from "@/type.ts";
import { createHooks, trys } from "@/utils.ts";
import { systemProcedure, userProcedure } from "./procedure.ts";

export const anonymousRouter = {
	get: userProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ context, input }) => {
			const { before, after } = createHooks(context.hooks, [
				"anonymous",
				"get",
			]);
			await before();

			const [error, data] = await trys(
				context.storage.read<CoreAnonymousData>(input.id),
			);

			if (error) throw getError("NOT_FOUND", "Chat not found");

			const userId = context.user.id;

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

			await after();
			return data;
		}),

	getMessages: userProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ context, input }) => {
			const { before, after } = createHooks(context.hooks, [
				"anonymous",
				"getMessages",
			]);
			await before();

			const mid = context.tools.getMessageDocId(input.id);

			const [readError, data] = await trys(
				context.storage.read<CoreAnonymousData>(input.id),
			);

			if (readError) throw getError("NOT_FOUND", "Chat not found");

			const userId = context.user.id;

			if (userId !== data.visibleUser && userId !== data.anonymousUser) {
				throw getError(
					"UNAUTHORIZED",
					"Only chat participants can read messages",
				);
			}

			const [messagesError, messages] = await trys(
				context.storage.getMessages(mid),
			);

			if (messagesError) throw getError("NOT_FOUND", "Messages not found");

			await after();

			if (userId === data.visibleUser) {
				return messages.map((msg) =>
					msg.from === data.anonymousUser ? { ...msg, from: "anonymous" } : msg,
				);
			}

			return messages;
		}),

	clearMessages: userProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ context, input }) => {
			const { before, after } = createHooks(context.hooks, [
				"anonymous",
				"clearMessages",
			]);
			await before();

			const mid = context.tools.getMessageDocId(input.id);

			if (context.system) {
				const [error] = await trys(context.storage.clearMessages(mid));

				if (error)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to clear messages");

				await after();
				return { success: true };
			}

			const [readError, data] = await trys(
				context.storage.read<CoreAnonymousData>(input.id),
			);

			if (readError) throw getError("NOT_FOUND", "Chat not found");

			const userId = context.user.id;

			if (userId !== data.visibleUser && userId !== data.anonymousUser) {
				throw getError(
					"UNAUTHORIZED",
					"You are not authorized to access this action",
				);
			}

			const [clearError] = await trys(context.storage.clearMessages(mid));

			if (clearError)
				throw getError("INTERNAL_SERVER_ERROR", "Failed to clear messages");

			await after();
			return { success: true };
		}),

	appendMessage: userProcedure
		.input(
			z.object({
				id: z.string(),
				data: z.record(z.string(), z.any()),
			}),
		)
		.handler(async ({ context, input }) => {
			const { before, after } = createHooks(context.hooks, [
				"anonymous",
				"appendMessage",
			]);
			await before();

			const mid = context.tools.getMessageDocId(input.id);

			const [readError, chatData] = await trys(
				context.storage.read<CoreAnonymousData>(input.id),
			);

			if (readError) throw getError("NOT_FOUND", "Chat not found");

			const userId = context.user.id;

			if (
				userId !== chatData.visibleUser &&
				userId !== chatData.anonymousUser
			) {
				throw getError(
					"UNAUTHORIZED",
					"Only chat participants can send messages",
				);
			}

			const newMessage = {
				id: context.tools.generateMessageId(),
				data: input.data,
				from: userId,
			};

			const [appendError] = await trys(
				context.storage.appendMessage(mid, newMessage),
			);

			if (appendError)
				throw getError("INTERNAL_SERVER_ERROR", "Failed to append message");

			await after();
			return newMessage;
		}),

	deleteMessage: userProcedure
		.input(
			z.object({
				id: z.string(),
				messageId: z.string(),
			}),
		)
		.handler(async ({ context, input }) => {
			const { before, after } = createHooks(context.hooks, [
				"anonymous",
				"deleteMessage",
			]);
			await before();

			const mid = context.tools.getMessageDocId(input.id);

			if (context.system) {
				const [error] = await trys(
					context.storage.deleteMessage(mid, input.messageId),
				);

				if (error)
					throw getError("INTERNAL_SERVER_ERROR", "Failed to delete message");

				await after();
				return { success: true };
			}

			const [readError, data] = await trys(
				context.storage.read<CoreAnonymousData>(input.id),
			);

			if (readError) throw getError("NOT_FOUND", "Chat not found");

			const userId = context.user.id;

			if (userId !== data.visibleUser && userId !== data.anonymousUser) {
				throw getError(
					"UNAUTHORIZED",
					"Only the chat participants can delete messages",
				);
			}

			const [deleteError] = await trys(
				context.storage.deleteMessage(mid, input.messageId),
			);

			if (deleteError)
				throw getError("INTERNAL_SERVER_ERROR", "Failed to delete message");

			await after();
			return { success: true };
		}),
} satisfies Permission<any>["anonymous"];

export const anonymousSystemRouter = {
	get: systemProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ context, input }) => {
			const { before, after } = createHooks(context.hooks, [
				"anonymous",
				"get",
			]);
			await before();

			const [error, data] = await trys(
				context.storage.read<CoreAnonymousData>(input.id),
			);

			if (error) throw getError("NOT_FOUND", "Chat not found");

			await after();
			return data;
		}),
	getMessages: systemProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ context, input }) => {
			const { before, after } = createHooks(context.hooks, [
				"anonymous",
				"getMessages",
			]);
			await before();

			const mid = context.tools.getMessageDocId(input.id);

			const [error, messages] = await trys(context.storage.getMessages(mid));

			if (error) throw getError("NOT_FOUND", "Messages not found");

			await after();
			return messages;
		}),
	clearMessages: systemProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ context, input }) => {
			const { before, after } = createHooks(context.hooks, [
				"anonymous",
				"clearMessages",
			]);
			await before();

			const mid = context.tools.getMessageDocId(input.id);

			const [error] = await trys(context.storage.clearMessages(mid));

			if (error)
				throw getError("INTERNAL_SERVER_ERROR", "Failed to clear messages");

			await after();
			return { success: true };
		}),

	appendMessage: systemProcedure
		.input(
			z.object({
				id: z.string(),
				user: z.string(),
				data: z.record(z.string(), z.any()),
			}),
		)
		.handler(async ({ context, input }) => {
			const { before, after } = createHooks(context.hooks, [
				"anonymous",
				"appendMessage",
			]);
			await before();

			const mid = context.tools.getMessageDocId(input.id);

			const [readError, chatData] = await trys(
				context.storage.read<CoreAnonymousData>(input.id),
			);

			if (readError) throw getError("NOT_FOUND", "Chat not found");

			if (
				chatData.visibleUser !== input.user ||
				chatData.anonymousUser !== input.user
			) {
				throw getError(
					"FORBIDDEN",
					"User ID does not match any chat participant",
				);
			}

			const newMessage = {
				id: context.tools.generateMessageId(),
				data: input.data,
				from: input.user,
			};

			const [appendError] = await trys(
				context.storage.appendMessage(mid, newMessage),
			);

			if (appendError)
				throw getError("INTERNAL_SERVER_ERROR", "Failed to append message");

			await after();
			return newMessage;
		}),

	deleteMessage: systemProcedure
		.input(
			z.object({
				id: z.string(),
				messageId: z.string(),
			}),
		)
		.handler(async ({ context, input }) => {
			const { before, after } = createHooks(context.hooks, [
				"anonymous",
				"deleteMessage",
			]);
			await before();

			const mid = context.tools.getMessageDocId(input.id);

			const [error] = await trys(
				context.storage.deleteMessage(mid, input.messageId),
			);

			if (error)
				throw getError("INTERNAL_SERVER_ERROR", "Failed to delete message");

			await after();
			return { success: true };
		}),
};
