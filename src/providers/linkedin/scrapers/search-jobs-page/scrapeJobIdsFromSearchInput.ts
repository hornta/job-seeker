import { prisma } from "../../../../db.ts";
import { getHtml } from "../../../../utils/getHtml.ts";
import { createJobSearchUrl } from "../../utils/createJobSearchUrl.ts";
import { extractJobIdFromUrn } from "../../utils/extractUtils.ts";
import type { LinkedinJobSearchInput } from "../../utils/linkedinSearchInput.ts";

export async function scrapeJobsSearchPage(inputs: LinkedinJobSearchInput[]) {
	for (const input of inputs) {
		await scrapeJobsPage(input);
	}
}

async function scrapeJobsPage(input: LinkedinJobSearchInput) {
	const url = createJobSearchUrl({ input, isInitial: true });

	console.log(`Scraping job IDs from URL: ${url}`);
	const jobIds = new Set<bigint>();
	const window = await getHtml(url);
	const items = window.document.querySelectorAll(
		".jobs-search__results-list li",
	);
	parsePostings(items);

	let start = 0;
	while (true) {
		if (start >= 1000) {
			console.log(
				"Reached maximum scraping limit of 1000 jobs. Stopping further requests.",
			);
			break;
		}

		const nextPageUrl = createJobSearchUrl({
			input: {
				...input,
				start,
			},
			isInitial: false,
		});

		const window = await getHtml(nextPageUrl);
		const items = window.document.querySelectorAll("li");

		if (items.length === 0) {
			break;
		}

		parsePostings(items);

		start += items.length;
	}

	function parsePostings(liElements: NodeListOf<Element>) {
		for (const item of liElements) {
			const element = item.querySelector('[data-entity-urn*="jobPosting"]');
			if (!element) {
				throw new Error("Element with data-entity-urn not found");
			}

			const urn = element.getAttribute("data-entity-urn");
			if (!urn) {
				throw new Error("data-entity-urn attribute is missing");
			}

			const linkedInJobId = extractJobIdFromUrn(urn);

			if (linkedInJobId === null) {
				throw new Error("Failed to extract job ID from URN");
			}

			jobIds.add(linkedInJobId);
		}
	}

	for (const id of jobIds.values()) {
		await prisma.linkedinJob.upsert({
			where: { linkedInJobId: id },
			create: { linkedInJobId: id },
			update: {},
		});
	}

	console.log(`Saved ${jobIds.size} job IDs to database`);
}
