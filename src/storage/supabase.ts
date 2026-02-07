import { StoragePlugin } from "../type.ts";

export const storage = (): StoragePlugin => {
	return {
		write: async() => {},
		read: async() => {}
	}
}
