# better-chats
Ever heard of better-auth? Same but for building chat

### Install

```bash
npm i better-chats
```

### Usage

```ts
import { Hono } from "hono";
import { betterChat } from "better-chats";
import { storage } from "better-chats/supabase.ts";

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
	userCheck: (data: { id: string }, type) => {
		switch (type) {
			case "group.update": return data.id === "rajat";
		}
		return false;
	},
});

const app = new Hono({}).basePath("/api");

app.on(["POST", "GET"], ["/chat/*"], (c) => {
	const user = { id: "rajat" };
	return chat.handler(c.req.raw, user);
});

export default app;
```
