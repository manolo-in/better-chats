import type { convertToDefault } from "./tools.ts";

export type WhoCanDo = "user" | "system";

export type StoragePlugin = {
	write: <Data = {}>(id: string, data: Data) => Promise<void>;
	writeDoc: <Data = {}>(id: string, data: Data) => Promise<void>;

	read: <Data = {}>(id: string) => Promise<Data>;
	readDoc: <Data = {}>(id: string) => Promise<Data>;

	update: <Data = {}>(id: string, data: Partial<Data>) => Promise<Data>;
	updateDoc: <Data = {}>(id: string, data: Partial<Data>) => Promise<Data>;

	delete: (id: string) => Promise<void>;
	deleteDoc: (id: string) => Promise<void>;

	getMessages: <MD = {}>(groupId: string) => Promise<MessageData<MD>[]>;
	appendMessage: <MD = {}>(
		groupId: string,
		message: MessageData<MD>,
	) => Promise<void>;
	deleteMessage: (groupId: string, messageId: string) => Promise<void>;
};

export type Permission<T> = {
	anonymous: {
		get: T;

		getMessages: T;
		clearMessages: T;

		appendMessage: T;
		deleteMessage: T;
	};
	group: {
		create: T;
		get: T;
		update: T;
		delete: T;

		join: T;
		leave: T;

		getMembers: T;
		addMembers: T;
		removeMembers: T;

		makeAdmin: T;
		removeAdmin: T;

		getMessages: T;
		appendMessage: T;
		deleteMessage: T;
	};
};

export type PermissionStrings<P = Permission<any>> = {
	[K in keyof P]: {
		[M in keyof P[K]]: `${K & string}.${M & string}`;
	}[keyof P[K]];
}[keyof P];

export type UserData = {
	id: string;
};

export type CoreGroupData = {
	id: string;
	owner: string;
	members: string[];
	admins: string[];
	createdAt: number;
	updatedAt: number;
};

export type GroupData<GD = {}> = {
	id: string;
	data: GD;
};

export type MessageData<MD = {}> = {
	id: string;
	from: string;
	data: MD;
};

export type Context<UD extends UserData = UserData> = (
	| {
			user: UD;
			system: false;
	  }
	| {
			user: undefined;
			system: true;
	  }
) &
	ReturnType<typeof convertToDefault>;

export type HookFunction<
	UD extends UserData,
	EX extends {} = {},
	PS = PermissionStrings,
> = (permission: PS, user: UD, data: EX) => Promise<boolean> | boolean;
