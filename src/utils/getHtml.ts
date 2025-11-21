import { parseHTML } from "linkedom";
import { withRetry } from "./withRetry.ts";

export async function getHtml(
	url: string,
	options: {
		onNotFound?: () => Promise<void>;
		handleRedirect?: (location: string | null) => Promise<string>;
	} = {},
) {
	const body = await withRetry(
		async () => {
			const response = await fetch(url, {
				redirect: "manual",
			});
			if (response.status >= 300 && response.status < 400) {
				const location = response.headers.get("location");
				return options.handleRedirect?.(location);
			}

			if (response.status === 404) {
				await options.onNotFound?.();
			}

			if (!response.ok) {
				throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
			}
			const body = await response.text();
			return body;
		},
		{
			initialDelay: 2000,
			maxAttempts: 6,
			onFailure(exception) {
				console.error(exception);
				console.warn(
					`Error fetching URL ${url}: ${(exception as Error).message}. Retrying...`,
				);
			},
		},
	);

	const window = parseHTML(body);
	return window;
}
