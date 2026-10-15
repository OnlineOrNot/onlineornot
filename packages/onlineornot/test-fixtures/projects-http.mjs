const nativeFetch = globalThis.fetch;
const origin = process.env.ONLINEORNOT_TEST_API_ORIGIN;
if (!origin || new URL(origin).hostname !== "127.0.0.1")
	throw new Error("Loopback API fixture required");
globalThis.fetch = async (input, init) => {
	const request = input instanceof Request ? input : new Request(input, init);
	const url = new URL(request.url);
	if (url.origin !== "https://api.onlineornot.com")
		throw new Error("Unexpected outbound request");
	return nativeFetch(
		new Request(new URL(url.pathname + url.search, origin), request),
	);
};
