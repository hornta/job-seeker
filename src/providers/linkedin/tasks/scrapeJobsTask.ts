import { prisma } from "../../../db.ts";
import { scrapeJobPage } from "../scrapers/job-page/scrapeJobPage.ts";

const LAST_SCRAPED_THRESHOLD = 24 * 60 * 60 * 1000;

export async function scrapeJobsTask() {
	console.log("\n--- Processing Job Postings ---");
	const nonSyncedOrPotentiallyStalePostings = await prisma.jobPosting.findMany({
		where: {
			OR: [
				{ lastScrapedAt: null },
				{
					lastScrapedAt: {
						lt: new Date(Date.now() - LAST_SCRAPED_THRESHOLD),
					},
				},
			],
			isDeleted: false,
		},
		take: 10,
		orderBy: {
			// Descending order to null values comes first
			lastScrapedAt: "desc",
		},
	});

	if (nonSyncedOrPotentiallyStalePostings.length === 0) {
		console.log("No job postings to process at this time.");
		return;
	}

	console.log(
		`Processing ${nonSyncedOrPotentiallyStalePostings.length} job postings...`,
	);

	for (const posting of nonSyncedOrPotentiallyStalePostings) {
		await scrapeJobPage(posting);
	}
	console.log("Finished processing job postings");
}
