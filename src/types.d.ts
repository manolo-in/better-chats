export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
		}
	: T;

export type DeepNonNullable<T> = T extends object
	? {
			[P in keyof T]: NonNullable<T[P]>;
		}
	: T;

export type SecondStepPartial<T> = T extends object
	? {
			[P in keyof T]?: T[P] extends object ? Partial<T[P]> : T[P];
		}
	: T;
