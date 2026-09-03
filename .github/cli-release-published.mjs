export function wasCliPublished(publishedPackages, expectedVersion) {
	if (!publishedPackages) return false;
	let packages;
	try {
		packages = JSON.parse(publishedPackages);
	} catch {
		throw new Error("changesets publishedPackages was not valid JSON");
	}
	if (!Array.isArray(packages))
		throw new Error("changesets publishedPackages was not an array");
	return packages.some(
		(entry) =>
			entry?.name === "onlineornot" && entry.version === expectedVersion,
	);
}

if (
	process.argv[1] &&
	import.meta.url === new URL(process.argv[1], "file:").href
) {
	console.log(wasCliPublished(process.argv[2], process.argv[3]));
}
