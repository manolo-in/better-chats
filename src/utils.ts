export const generateId = () => {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
};

export const createHooks = (
	props?: Partial<{
		before: () => Promise<boolean>;
		after: () => Promise<void>;
	}>,
): Required<NonNullable<typeof props>> => {
	return {
		before: props?.before ?? (async () => true),
		after: props?.after ?? (async () => {}),
	};
};
