import type {
	CheckInput,
	CheckListItem as ApiCheckListItem,
	CheckPatch,
	ExpandedCheck,
} from "@onlineornot/api";

export type Check = ExpandedCheck;
export type CheckListItem = ApiCheckListItem;
export type CreateCheckParams = CheckInput;
export type UpdateCheckParams = CheckPatch;
export type Assertion = NonNullable<CheckInput["assertions"]>[number];

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
