import { RPCHandler } from "@orpc/server/fetch";
import { appRouter } from "./api";

type StoragePlugin = {
	write: () => Promise<void>;
	read: () => Promise<void>;
};

export const betterChat = (props: { storage: StoragePlugin }) => {
	return {
		handler: async (raw: Request) => {
			const handler = new RPCHandler(appRouter);

			const { matched, response } = await handler.handle(raw, {
				prefix: "/api/chat",
				context: {},
			});

			if (matched) {
				return response;
			}
		},
	};
};
