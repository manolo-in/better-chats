export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
		}
	: T;
