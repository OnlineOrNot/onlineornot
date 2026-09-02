/** Whether this bundle was compiled as a standalone executable. */
export function isStandaloneExecutable(): boolean {
	return process.env.ONLINEORNOT_SEA === "true";
}
