import { webcrypto as crypto } from "node:crypto";

const PKCE_CHARSET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/**
 * Base64url encode (RFC 4648 § 5) without padding
 */
function base64urlEncode(value: string): string {
	let base64 = Buffer.from(value, "binary").toString("base64");
	base64 = base64.replace(/\+/g, "-");
	base64 = base64.replace(/\//g, "_");
	base64 = base64.replace(/=/g, "");
	return base64;
}

/**
 * Generate PKCE code verifier and challenge (RFC 7636)
 */
export async function generatePKCECodes(): Promise<{
	codeVerifier: string;
	codeChallenge: string;
}> {
	// Generate 96 random bytes for code verifier (max allowed length after base64url encoding)
	const output = new Uint32Array(96);
	crypto.getRandomValues(output);

	const codeVerifier = base64urlEncode(
		Array.from(output)
			.map((num) => PKCE_CHARSET[num % PKCE_CHARSET.length])
			.join(""),
	);

	// Create SHA-256 hash for code challenge
	const buffer = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(codeVerifier),
	);
	const hash = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < hash.byteLength; i++) {
		binary += String.fromCharCode(hash[i]);
	}
	const codeChallenge = base64urlEncode(binary);

	return { codeVerifier, codeChallenge };
}

/**
 * Generate random state parameter for CSRF protection
 */
export function generateState(length = 32): string {
	const output = new Uint32Array(length);
	crypto.getRandomValues(output);
	return base64urlEncode(
		Array.from(output)
			.map((num) => PKCE_CHARSET[num % PKCE_CHARSET.length])
			.join(""),
	);
}
