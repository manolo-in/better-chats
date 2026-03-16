import type { onError } from "@orpc/server";
import type { Permission, StoragePlugin } from "./type.ts";
import type { SecondStepPartial } from "./types.d.ts";
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
	basePath: "/api/chat/" as `/${string}`,
	...props,
	api: {
		test: false,
		anonymous: false,
		group: false,
		...props.api,
	} as const,
});

export const convertToDefault = (props: {
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
	};
};
