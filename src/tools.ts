import type { onError } from "@orpc/server";
import type { Permission, StoragePlugin, WhoCanDo } from "./type.ts";

export const convertToDefault = (props: {
	permission: DeepPartial<Permission<WhoCanDo>>;
	tools?: {
		generateId?: () => string;
		generateDocId?: (id: string) => string;
		generateMessageDocId?: (id: string) => string;
		generateMessageId?: () => string;
		onError?: Parameters<typeof onError>[0];
	};
	storage: StoragePlugin;
}) => {
	return {
		...props,
		tools: {
			generateId: () => `1234567890`,
			generateDocId: (id: string) => `${id}_data`,
			generateMessageDocId: (id: string) => `${id}_messages`,
			generateMessageId: () => `1234567890`,
			onError: (error: unknown) => {
				console.error(error);
			},
			...props.tools,
		},
		permission: {
			group: {
				get: "user",
				create: "user",
				update: "user",
				delete: "user",

				join: "user",
				leave: "user",

				getMembers: "user",
				addMembers: "user",
				removeMembers: "user",

				makeAdmin: "user",
				removeAdmin: "user",

				getMessages: "user",
				appendMessage: "user",
				deleteMessage: "user",
				...props.permission.group,
			} as const,
		},
	};
};
