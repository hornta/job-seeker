import { prisma } from "../../../db.ts";
import { scrapeCompanyPage } from "../scrapers/company-page/scrapeCompanyPage.ts";

async function getCompaniesToScrape() {
	// Get 1000 companies that have never been scraped or were last scraped over 7 days ago
	const companies = await prisma.linkedinCompany.findMany({
		where: {
			OR: [
				{ lastScrapedAt: null },
				{
					lastScrapedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
				},
			],
		},
		take: 1000,
		orderBy: { lastScrapedAt: "desc" },
	});

	const companiesToScrape =
		companies.length > 0
			? companies.map((company) => company.companySlug)
			: ["openai"];
	return companiesToScrape;
}

export const scrapeCompaniesTask = async () => {
	const companiesToScrape = await getCompaniesToScrape();
	console.log(`Scraping ${companiesToScrape.length} companies`);
	for (const companySlug of companiesToScrape) {
		await scrapeCompanyPage(companySlug);
	}
	console.log("Finished scraping companies");
};
