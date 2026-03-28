import type { ArgumentsCamelCase, Argv } from "yargs";

// Recreate CamelCaseKey since it's not exported from @types/yargs
type PascalCase<S extends string> = string extends S
	? string
	: S extends `${infer T}-${infer U}`
		? `${Capitalize<T>}${PascalCase<U>}`
		: Capitalize<S>;

type CamelCase<S extends string> = string extends S
	? string
	: S extends `${infer T}-${infer U}`
		? `${T}${PascalCase<U>}`
		: S;

type CamelCaseKey<K extends PropertyKey> = K extends string
	? Exclude<CamelCase<K>, "">
	: K;

/**
 * Yargs options included in every onlineornot command.
 */
export interface CommonYargsOptions {
	v: boolean | undefined;
}

export type CommonYargsArgv = Argv<CommonYargsOptions>;

export type YargvToInterface<T> =
	T extends Argv<infer P> ? ArgumentsCamelCase<P> : never;

// See http://stackoverflow.com/questions/51465182/how-to-remove-index-signature-using-mapped-types
type RemoveIndex<T> = {
	[K in keyof T as string extends K
		? never
		: number extends K
			? never
			: K]: T[K];
};

/**
 * Given some Yargs Options function factory, extract the interface
 * that corresponds to the yargs arguments, remove index types, and only allow camelCase
 */
export type StrictYargsOptionsToInterface<
	T extends (yargs: CommonYargsArgv) => Argv,
> = T extends (yargs: CommonYargsArgv) => Argv<infer P>
	? OnlyCamelCase<RemoveIndex<ArgumentsCamelCase<P>>>
	: never;

type OnlyCamelCase<T = Record<string, never>> = {
	[key in keyof T as CamelCaseKey<key>]: T[key];
};
