import { hookRunner } from "./error.ts";

export const generateId = () => {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
};

export const createHooks = <
	T extends {
		before: () => Promise<boolean>;
		after: () => Promise<void>;
	},
	C extends {
		[key in PropertyKey]: {
			[key in PropertyKey]: Partial<T>;
		};
	},
	K1 extends keyof C,
	K2 extends keyof C[K1],
>(
	container: Partial<C>,
	[k1, k2]: readonly [K1, K2],
) => {
	const operations = container[k1];
	const props = (
		typeof operations === "object" ? operations[k2] : undefined
	) as T;

	return createNormalHooks(props, `${String(k1)}-${String(k2)}`);
};

export const createNormalHooks = <
	T extends {
		before: () => Promise<boolean>;
		after: () => Promise<void>;
	},
>(
	props: T | undefined,
	tag: string,
) => {
	return {
		before: async () => {
			if (props?.before)
				await hookRunner(props.before(), `${tag} (before)`, true);
		},
		after: async () => {
			if (props?.after)
				await hookRunner(props.after(), `${tag} (after)`, false);
		},
	};
};

export const trys = <T, U = Error>(promise: Promise<T>) =>
	promise
		.then((data: T) => [undefined, data, true] as const)
		.catch((error: U) => [error, undefined, false] as const);
