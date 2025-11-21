import { scrapeJobsSearchPage } from "../scrapers/search-jobs-page/scrapeJobIdsFromSearchInput.ts";
import type { LinkedinJobSearchInput } from "../utils/linkedinSearchInput.ts";

const searchInputs: LinkedinJobSearchInput[] = [
	{
		query: "react",
		geoId: 103644278,
		location: "United States",
		workType: ["on-site"],
		jobType: ["full-time"],
		time: 86400,
	},
	{
		query: "typescript",
		geoId: 103644278,
		location: "United States",
		workType: ["on-site"],
		jobType: ["full-time"],
		time: 86400,
	},
];

export async function discoverJobIdsTask() {
	console.log("\n--- Scraping Job IDs ---");
	await scrapeJobsSearchPage(searchInputs);
	console.log("Job IDs saved to database");
}
