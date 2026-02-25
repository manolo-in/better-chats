# better-chats
Ever heard of better-auth? Same but for building chat

### Install

```bash
npm i better-chats @orpc/server
```

### Usage

```ts
import { Hono } from "hono";
import { betterChat } from "better-chats";
import { storage } from "better-chats/supabase";

const chat = betterChat({
	permission: {
		group: {
			create: "system",
			delete: "system",
			get: "user",
			update: "user",
		},
	},
	storage: storage(),
	userCheck: (type, user, chat) => {
		switch (type) {
			case "group.update":
				return user.id === "rajat";
		}
		return true;
	},
});

const app = new Hono({}).basePath("/api");

app.on(["POST", "GET"], ["/chat/*"], (c) => {
	const user = { id: "rajat" }; // fetch ur user here

	return chat.handler(c.req.raw, user);
});

export type ChatRouter = typeof chat.$type
export default app;
```

## Client

```bash
npm i @orpc/client @orpc/server
```

```ts
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";

export const link = new RPCLink({
	url: `${baseUrl}/api/chat`,
	fetch(url, options) {
		return fetch(url, {
			...options,
			credentials: "include",
		});
	},
});


export const chatClient: RouterClient<ChatRouter> = createORPCClient(link);
```
