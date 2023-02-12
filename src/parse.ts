const JSON_ERROR_SUFFIX = " in JSON at position ";
/**
 * A minimal type describing a package.json file.
 */
export type PackageJSON = {
	devDependencies?: Record<string, unknown>;
	dependencies?: Record<string, unknown>;
	scripts?: Record<string, unknown>;
};
export type Message = {
	text: string;
	location?: Location;
	notes?: Message[];
	kind?: "warning" | "error";
};

export type Location = File & {
	line: number;
	column: number;
	length?: number;
	lineText?: string;
	suggestion?: string;
};

export type File = {
	file?: string;
	fileText?: string;
};

/**
 * An error that's thrown when something fails to parse.
 */
export class ParseError extends Error implements Message {
	readonly text: string;
	readonly notes: Message[];
	readonly location?: Location;
	readonly kind: "warning" | "error";

	constructor({ text, notes, location, kind }: Message) {
		super(text);
		this.name = this.constructor.name;
		this.text = text;
		this.notes = notes ?? [];
		this.location = location;
		this.kind = kind ?? "error";
	}
}
/**
 * A typed version of `parseJSON()`.
 */
export function parsePackageJSON<T extends PackageJSON = PackageJSON>(
	input: string,
	file?: string
): T {
	return parseJSON<T>(input, file);
}

/**
 * A wrapper around `JSON.parse` that throws a `ParseError`.
 */
export function parseJSON<T>(input: string, file?: string): T {
	try {
		return JSON.parse(input);
	} catch (err) {
		const { message } = err as Error;
		const index = message.lastIndexOf(JSON_ERROR_SUFFIX);
		if (index < 0) {
			throw err;
		}
		const text = message.substring(0, index);
		const position = parseInt(
			message.substring(index + JSON_ERROR_SUFFIX.length)
		);
		const location = indexLocation({ file, fileText: input }, position);
		throw new ParseError({ text, location });
	}
}

/**
 * Calculates the line and column location from an index.
 */
export function indexLocation(file: File, index: number): Location {
	let lineText,
		line = 0,
		column = 0,
		cursor = 0;
	const { fileText = "" } = file;
	for (const row of fileText.split("\n")) {
		line++;
		cursor += row.length + 1;
		if (cursor >= index) {
			lineText = row;
			column = row.length - (cursor - index);
			break;
		}
	}
	return { lineText, line, column, ...file };
}
