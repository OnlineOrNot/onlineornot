import { execFileSync } from "node:child_process";

function git(args) {
	return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function versionAtCommit(commit, packageJsonPath) {
	try {
		return JSON.parse(git(["show", `${commit}:${packageJsonPath}`])).version;
	} catch {
		return undefined;
	}
}

export function findPackageVersionCommit(packageJsonPath, expectedVersion) {
	const commits = git(["log", "--format=%H", "--", packageJsonPath])
		.split("\n")
		.filter(Boolean);

	for (const commit of commits) {
		if (versionAtCommit(commit, packageJsonPath) !== expectedVersion) continue;

		const [, firstParent] = git([
			"rev-list",
			"--parents",
			"-n",
			"1",
			commit,
		]).split(" ");
		if (
			!firstParent ||
			versionAtCommit(firstParent, packageJsonPath) !== expectedVersion
		) {
			return commit;
		}
	}

	throw new Error(
		`Could not find the commit that set ${packageJsonPath} to ${expectedVersion}`,
	);
}

if (
	process.argv[1] &&
	import.meta.url === new URL(process.argv[1], "file:").href
) {
	console.log(findPackageVersionCommit(process.argv[2], process.argv[3]));
}
