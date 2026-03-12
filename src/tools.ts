import type { onError } from "@orpc/server";
import type { Permission, StoragePlugin, WhoCanDo } from "./type.ts";
import type { DeepPartial, SecondStepPartial } from "./types.d.ts";
import { generateId } from "./utils.ts";

export const convertToDefaultSystem = (props: {
	/**
	 * @default "/api/chat/"
	 * */
	basePath?: `/${string}`;
	api?: Partial<
		{
			[K in keyof Permission<any>]: boolean;
		} & {
			test: boolean;
		}
	>;
}) => ({
	api: {
		test: false,
		anonymous: false,
		group: false,
		...props.api,
	} as const,
	basePath: "/api/chat/" as `/${string}`,
	...props,
});

export const convertToDefault = (props: {
	permission?: DeepPartial<Permission<WhoCanDo>>;
	hooks?: SecondStepPartial<
		Permission<
			Partial<{
				before: () => Promise<boolean>;
				after: () => Promise<void>;
			}>
		>
	>;
	tools?: {
		/**
		 * @default webcrypto.Crypto
		 */
		generateId?: () => string;
		/**
		 * @default (id: string) => `${id}_data`
		 */
		generateDocId?: (id: string) => string;
		/**
		 * @default (id: string) => `${id}_messages`
		 */
		generateMessageDocId?: (id: string) => string;
		/**
		 * @default webcrypto.Crypto
		 */
		generateMessageId?: () => string;
		onError?: Parameters<typeof onError>[0];
	};
	storage: StoragePlugin;
}) => {
	return {
		...props,
		hooks: {
			...props.hooks,
		},
		tools: {
			generateId: () => generateId(),
			getDocId: (id: string) => `${id}_data`,
			getMessageDocId: (id: string) => `${id}_messages`,
			generateMessageId: () => generateId(),
			onError: (error: unknown) => {
				console.error(error);
			},
			...props.tools,
		},
		permission: {
			anonymous: {
				get: "user",
				getMessages: "user",
				appendMessage: "user",
				deleteMessage: "user",
				clearMessages: "user",
				...props.permission?.anonymous,
			} as const,
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
				...props.permission?.group,
			} as const,
		},
	};
};
