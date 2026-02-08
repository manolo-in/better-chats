import type { StoragePlugin } from "@/type.ts";

export const storage = (): StoragePlugin => {
	return {
		write: async (id, data) => {},
		writeDoc: async (id, data) => {},

		read: async (id) => ({}) as any,
		readDoc: async (id) => ({}) as any,

		update: async (id, data) => ({}) as any,
		updateDoc: async (id, data) => ({}) as any,

		delete: async (id) => {},
		deleteDoc: async (id) => {},

		getMessages: async (id) => [],
		appendMessage: async (id) => {},
		deleteMessage: async (id) => {},
	};
};
