import Conf from "conf";
import os from "node:os";
import path from "node:path";

export interface SetupCheckState {
	url: string;
	name: string;
	checkId?: string;
}

interface SetupState {
	check?: SetupCheckState;
}

const config = new Conf<SetupState>({
	projectName: "onlineornot",
	cwd: path.join(os.homedir(), ".config", "onlineornot"),
	configName: "setup",
});

export function getSetupCheckState(): SetupCheckState | null {
	const check = config.get("check");
	if (
		!check ||
		typeof check.url !== "string" ||
		typeof check.name !== "string" ||
		(check.checkId !== undefined && typeof check.checkId !== "string")
	) {
		return null;
	}
	return check;
}

export function saveSetupCheckState(check: SetupCheckState): void {
	config.set("check", check);
}
