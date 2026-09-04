import { describe, expect, it, vi } from "vitest";

import { paginateAllCursors, paginateAllPages } from "./pagination";

describe("API pagination", () => {
	it("collects every numbered page", async () => {
		const fetchPage = vi.fn(async (page: number, pageSize: number) => ({
			items: Array.from(
				{ length: Math.min(pageSize, 5 - (page - 1) * pageSize) },
				(_value, index) => (page - 1) * pageSize + index + 1,
			),
			totalItems: 5,
		}));

		await expect(paginateAllPages(fetchPage, { pageSize: 2 })).resolves.toEqual(
			[1, 2, 3, 4, 5],
		);
		expect(fetchPage.mock.calls).toEqual([
			[1, 2],
			[2, 2],
			[3, 2],
		]);
	});

	it("collects every cursor page", async () => {
		const fetchPage = vi.fn(
			async (cursor: string | undefined, pageSize: number) => {
				expect(pageSize).toBe(100);
				return cursor === undefined
					? { items: [1, 2], nextCursor: "next" }
					: { items: [3] };
			},
		);

		await expect(paginateAllCursors(fetchPage)).resolves.toEqual([1, 2, 3]);
		expect(fetchPage.mock.calls).toEqual([
			[undefined, 100],
			["next", 100],
		]);
	});

	it("rejects a repeated cursor instead of looping forever", async () => {
		const fetchPage = vi.fn(async () => ({
			items: [1],
			nextCursor: "repeated",
		}));

		await expect(paginateAllCursors(fetchPage)).rejects.toThrow(
			"The API returned the same pagination cursor twice.",
		);
		expect(fetchPage).toHaveBeenCalledTimes(2);
	});
});
