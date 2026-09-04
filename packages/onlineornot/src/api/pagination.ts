const DEFAULT_PAGE_SIZE = 100;

export interface NumberedPage<T> {
	items: T[];
	totalItems: number;
}

export interface CursorPage<T> {
	items: T[];
	nextCursor?: string;
}

interface PaginationOptions {
	pageSize?: number;
}

/** Fetch and concatenate every page from a page-number-based endpoint. */
export async function paginateAllPages<T>(
	fetchPage: (page: number, pageSize: number) => Promise<NumberedPage<T>>,
	options: PaginationOptions = {},
): Promise<T[]> {
	const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
	const items: T[] = [];
	let page = 1;

	while (true) {
		const result = await fetchPage(page, pageSize);
		items.push(...result.items);

		if (items.length >= result.totalItems || result.items.length === 0) {
			return items;
		}
		page += 1;
	}
}

/** Fetch and concatenate every page from a cursor-based endpoint. */
export async function paginateAllCursors<T>(
	fetchPage: (
		cursor: string | undefined,
		pageSize: number,
	) => Promise<CursorPage<T>>,
	options: PaginationOptions = {},
): Promise<T[]> {
	const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
	const items: T[] = [];
	let cursor: string | undefined;

	while (true) {
		const result = await fetchPage(cursor, pageSize);
		items.push(...result.items);

		if (!result.nextCursor) {
			return items;
		}
		if (result.nextCursor === cursor) {
			throw new Error("The API returned the same pagination cursor twice.");
		}
		cursor = result.nextCursor;
	}
}
