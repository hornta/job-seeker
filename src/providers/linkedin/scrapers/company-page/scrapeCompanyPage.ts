import { rm } from "node:fs/promises";
import { chromium } from "patchright";
import type { Prisma } from "../../../../../generated/prisma/client.ts";
import { prisma } from "../../../../db.ts";
import { getHtml } from "../../../../utils/getHtml.ts";
import {
	findElement,
	getAttributeOrThrow,
	getElement,
	getTextOrThrowIfEmpty,
} from "../../../../utils/scrapeUtils.ts";
import { buildLinkedInCompanyUrl } from "../../utils/buildLinkedInCompanyUrl.ts";
import { extractCompanyName } from "../../utils/extractUtils.ts";
import { isSchoolPage } from "../../utils/isSchoolPage.ts";

async function getHtmlFromSchoolPage(url: string) {
	await rm("./tmp", { recursive: true });
	const browser = await chromium.launchPersistentContext("./tmp/profile", {
		channel: "chrome",
		headless: false,
		viewport: null,
	});

	console.log(`Navigating to school page: ${location}`);
	const page = await browser.newPage();
	const response = await page.goto(url, {
		waitUntil: "domcontentloaded",
	});
	if (!response) {
		throw new Error("Missing response");
	}
	if (response.status() !== 999) {
		throw new Error(
			`Unexpected status code after redirect: ${response.status()}. Expected 999.`,
		);
	}

	const newPage = await browser.newPage();
	const newResponse = await newPage.goto(url);
	if (!newResponse) {
		throw new Error("Missing response after sleep");
	}
	const html = await newResponse.text();
	return html;
}

export async function scrapeCompanyPage(companySlug: string) {
	console.log(`Scraping company: ${companySlug}`);

	const url = buildLinkedInCompanyUrl(companySlug);
	const window = await getHtml(url, {
		handleRedirect(location) {
			if (location === null) {
				throw new Error(
					`Redirect response from ${url} missing Location header`,
				);
			}

			if (isSchoolPage(location)) {
				return getHtmlFromSchoolPage(location);
			}

			throw new Error(`Unexpected redirect to ${location}`);
		},
	});

	findUnexploredSections();

	const companyId = extractCompanyId();
	const title = extractTitle();
	const industry = extractIndustry();
	const companySize = extractCompanySize();
	const headquartersLocation = extractHeadquartersLocation();
	const websiteUrl = extractWebsiteUrl();
	const organizationType = extractOrganizationType();
	const foundedYear = extractFoundedYear();
	const specialties = extractSpecialties();
	const description = extractDescription();

	const similarPages = extractSimilarPages();
	for (const similarCompanySlug of similarPages) {
		await prisma.linkedinCompany.upsert({
			where: { companySlug: similarCompanySlug },
			create: { companySlug: similarCompanySlug },
			update: {},
		});
	}

	const updateData: Prisma.LinkedinCompanyCreateInput = {
		title,
		industry,
		companySize,
		headquartersLocation,
		websiteUrl,
		organizationType,
		foundedYear,
		specialties,
		description,
		lastScrapedAt: new Date(),
		linkedinCompanyId: companyId,
		companySlug,
	};

	await prisma.linkedinCompany.upsert({
		where: { companySlug: companySlug },
		create: updateData,
		update: updateData,
	});

	function extractTitle() {
		const titleElement = getElement(window, "h1");
		return getTextOrThrowIfEmpty(titleElement);
	}

	function extractCompanyId() {
		const companyIdElement = getElement(
			window,
			'a[data-semaphore-content-urn^="urn:li:organization:"]',
		);
		const urn = getAttributeOrThrow(
			companyIdElement,
			"data-semaphore-content-urn",
		);
		const match = urn.match(/urn:li:organization:(\d+)/);
		if (!match) {
			throw new Error("Failed to extract company ID from URN");
		}
		return Number(match[1]);
	}

	function extractIndustry() {
		const industryElement = findElement(
			window,
			'div[data-test-id="about-us__industry"] dd',
		);
		if (!industryElement) {
			return null;
		}
		return getTextOrThrowIfEmpty(industryElement);
	}

	function extractCompanySize() {
		const sizeElement = findElement(
			window,
			'div[data-test-id="about-us__size"] dd',
		);
		if (!sizeElement) {
			return null;
		}
		return getTextOrThrowIfEmpty(sizeElement);
	}

	function extractHeadquartersLocation() {
		const locationElement = findElement(
			window,
			'div[data-test-id="about-us__headquarters"] dd',
		);
		if (!locationElement) {
			return null;
		}
		return getTextOrThrowIfEmpty(locationElement);
	}

	function extractWebsiteUrl() {
		const websiteElement = findElement(
			window,
			'div[data-test-id="about-us__website"] dd a',
		);
		if (!websiteElement) {
			return null;
		}
		let url = getTextOrThrowIfEmpty(websiteElement);

		if (!url.startsWith("http://") && !url.startsWith("https://")) {
			url = `https://${url}`;
		}
		new URL(url);
		return url.replace(/\/$/, "");
	}

	function extractFoundedYear() {
		const foundedElement = findElement(
			window,
			'div[data-test-id="about-us__foundedOn"] dd',
		);
		if (!foundedElement) {
			return null;
		}
		const content = getTextOrThrowIfEmpty(foundedElement);
		const year = Number(content);
		if (Number.isNaN(year)) {
			throw new Error("Founded year is not a valid number");
		}
		return year;
	}

	function extractSpecialties() {
		const specialtiesElement = findElement(
			window,
			'div[data-test-id="about-us__specialties"] dd',
		);
		if (!specialtiesElement) {
			return null;
		}
		return getTextOrThrowIfEmpty(specialtiesElement);
	}

	function extractOrganizationType() {
		const organizationTypeElement = findElement(
			window,
			'div[data-test-id="about-us__organizationType"] dd',
		);
		if (!organizationTypeElement) {
			return null;
		}
		return getTextOrThrowIfEmpty(organizationTypeElement);
	}

	function extractDescription() {
		const descriptionElement = findElement(
			window,
			'p[data-test-id="about-us__description"]',
		);
		if (!descriptionElement) {
			return null;
		}
		return getTextOrThrowIfEmpty(descriptionElement);
	}

	const knownSections = new Set<string>([
		"headquarters",
		"website",
		"industry",
		"organizationType",
		"specialties",
		"foundedOn",
		"size",
	]);

	function findUnexploredSections() {
		const allSections = window.document.querySelectorAll(
			'section[data-test-id^="about-us__"]',
		);
		for (const section of allSections) {
			const testId = getAttributeOrThrow(section, "data-test-id");
			const sectionName = testId.replace("about-us__", "");
			if (!knownSections.has(sectionName)) {
				throw new Error(`Unknown company section found: ${sectionName}`);
			}
		}
	}

	function extractSimilarPages() {
		const similarPages: string[] = [];
		const similarPageElements = window.document.querySelectorAll(
			'a[data-tracking-control-name="similar-pages"]',
		);
		for (const element of similarPageElements) {
			const href = getAttributeOrThrow(element, "href");
			const companySlug = extractCompanyName(href);
			if (!companySlug) {
				throw new Error("Failed to extract company slug from similar page URL");
			}
			similarPages.push(companySlug);
		}
		return similarPages;
	}
}
