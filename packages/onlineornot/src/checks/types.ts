import type {
	CreateCheckData,
	UpdateCheckData,
	CreateCheckResponses,
	ListChecksResponses,
} from "@onlineornot/api";

export type Check = CreateCheckResponses[201]["result"];
export type CheckListItem = Exclude<
	ListChecksResponses[200],
	{ success: false }
>["result"][number];
export type CreateCheckParams = CreateCheckData["body"];
export type UpdateCheckParams = UpdateCheckData["body"];
export type Assertion = NonNullable<CreateCheckParams["assertions"]>[number];

export type CheckStatus = CheckListItem["status"];

export type CheckRegion =
	| "aws:us-east-1"
	| "aws:us-west-1"
	| "aws:eu-central-1"
	| "aws:ap-south-1"
	| "aws:ap-southeast-2"
	| "aws:ap-northeast-1";

export const VALID_REGIONS: CheckRegion[] = [
	"aws:us-east-1",
	"aws:us-west-1",
	"aws:eu-central-1",
	"aws:ap-south-1",
	"aws:ap-southeast-2",
	"aws:ap-northeast-1",
];

export const VALID_METHODS = [
	"GET",
	"HEAD",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
] as const;
