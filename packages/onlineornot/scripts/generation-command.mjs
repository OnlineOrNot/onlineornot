import { spawn, spawnSync } from "node:child_process";

export function runGenerationCommand(
	stage,
	command,
	args,
	input,
	timeoutMs = 60_000,
	cwd,
) {
	if (timeoutMs <= 0)
		throw new Error(`CLI generation deadline exceeded before ${stage}`);
	process.stderr.write(`CLI generation: ${stage}\n`);
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ["pipe", "pipe", "pipe"],
			cwd,
			detached: process.platform !== "win32",
		});
		let stdout = "";
		let stderr = "";
		let failure;
		const terminate = () => {
			if (!child.pid) return;
			if (process.platform === "win32") {
				const result = spawnSync(
					"taskkill",
					["/pid", String(child.pid), "/T", "/F"],
					{ timeout: 5_000, encoding: "utf8" },
				);
				if (result.error || result.status !== 0) child.kill("SIGKILL");
			} else {
				try {
					process.kill(-child.pid, "SIGKILL");
				} catch (error) {
					if (error.code !== "ESRCH") child.kill("SIGKILL");
				}
			}
		};
		const timer = setTimeout(() => {
			failure = `timed out after ${timeoutMs}ms`;
			terminate();
		}, timeoutMs);
		const onInterrupt = () => {
			failure = "interrupted by SIGINT";
			terminate();
		};
		const onTerminate = () => {
			failure = "interrupted by SIGTERM";
			terminate();
		};
		process.on("SIGINT", onInterrupt);
		process.on("SIGTERM", onTerminate);
		const cleanup = () => {
			clearTimeout(timer);
			process.off("SIGINT", onInterrupt);
			process.off("SIGTERM", onTerminate);
		};
		const capture = (stream, chunk) => {
			if (stream === "stdout") stdout += chunk;
			else stderr += chunk;
			if (stdout.length + stderr.length > 8_000_000 && !failure) {
				failure = "exceeded the output limit";
				terminate();
			}
		};
		child.stdout.on("data", (chunk) => capture("stdout", chunk));
		child.stderr.on("data", (chunk) => capture("stderr", chunk));
		child.stdin.on("error", (error) => {
			if (error.code !== "EPIPE") {
				failure = error.message;
				terminate();
			}
		});
		child.on("error", (error) => {
			cleanup();
			reject(
				new Error(`CLI generation ${stage} failed: ${error.message}`, {
					cause: error,
				}),
			);
		});
		child.on("close", (code, signal) => {
			cleanup();
			if (failure || code !== 0) {
				reject(
					new Error(
						`CLI generation ${stage} ${failure ?? `failed (${signal ?? code})`}:\n${stderr}${stdout}`,
					),
				);
			} else resolve(stdout);
		});
		child.stdin.end(input);
	});
}
