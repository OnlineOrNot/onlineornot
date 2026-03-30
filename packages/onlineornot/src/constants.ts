export const PROD_API_BASE_URL = "https://api.onlineornot.com/v1";
export const LOCAL_API_BASE_URL = "http://localhost:8787/v1";

export const API_BASE_URL =
	process.env.NODE_ENV === "development"
		? LOCAL_API_BASE_URL
		: PROD_API_BASE_URL;
