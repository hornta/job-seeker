import { writeFile } from "node:fs/promises";
import type { Tool, ToolUseBlock } from "@anthropic-ai/sdk/resources";
import { toJSONSchema } from "zod";
import type {
	JobPosting,
	Prisma,
} from "../../../../../generated/prisma/client.ts";
import { anthropicClient } from "../../../../anthropic/anthropicClient.ts";
import { SYSTEM_PROMPT } from "../../../../anthropic/systemPrompt.ts";
import { prisma } from "../../../../db.ts";
import { ENV } from "../../../../env.ts";
import { createChecksum } from "../../../../utils/createChecksum.ts";
import { firstOrThrow } from "../../../../utils/firstOrThrow.ts";
import { getHtml } from "../../../../utils/getHtml.ts";
import { withRetry } from "../../../../utils/withRetry.ts";
import { extractCompanyName } from "../../utils/extractUtils.ts";
import { type JobExtraction, JobExtractionSchema } from "./schemas.ts";

export async function scrapeJobPage(jobPosting: JobPosting) {
	const window = await getHtml(
		`https://www.linkedin.com/jobs/view/${jobPosting.linkedInJobId}`,
		{
			async onNotFound() {
				console.log(
					`Job posting ID ${jobPosting.id} not found (404). Marking as deleted.`,
				);
				await prisma.jobPosting.update({
					where: { id: jobPosting.id },
					data: { isDeleted: true, lastScrapedAt: new Date() },
				});
			},
		},
	);

	const jobTitle = getJobTitle();
	const companyId = getCompanyId();
	const companyName = getCompanyName();
	const location = getLocation();
	const description = getJobDescription();

	function getCompanyId() {
		const metaEls = Array.from(
			window.document.querySelectorAll('meta[name="companyId"]'),
		);
		if (metaEls.length === 0) {
			console.log("Company ID meta element not found");
			return null;
		} else if (metaEls.length > 1) {
			throw new Error("Multiple Company ID meta elements found");
		}
		const content = firstOrThrow(metaEls).getAttribute("content");
		if (content === null) {
			throw new Error("Company ID meta content is null");
		}
		const contentValue = content.trim();
		if (contentValue === "") {
			throw new Error("Company ID meta content is empty");
		}
		const companyId = Number(contentValue);
		if (Number.isNaN(companyId)) {
			throw new Error("Company ID is not a valid number");
		}
		return companyId;
	}

	function getLocation() {
		const locationEls = Array.from(
			window.document.querySelectorAll(
				".topcard__flavor-row:first-child .topcard__flavor--bullet",
			),
		);
		if (locationEls.length === 0) {
			throw new Error("Location element not found");
		} else if (locationEls.length > 1) {
			throw new Error("Multiple location elements found");
		}
		const locationEl = firstOrThrow(locationEls);
		const location = locationEl.textContent.trim();
		if (!location) {
			throw new Error("Location text is empty");
		}
		return location;
	}

	function getCompanyName() {
		const companyLinkEls = Array.from(
			window.document.querySelectorAll("a.topcard__org-name-link"),
		);
		if (companyLinkEls.length === 0) {
			console.log("Company link element not found");
			return null;
		} else if (companyLinkEls.length > 1) {
			throw new Error("Multiple company link elements found");
		}
		const companyLinkEl = firstOrThrow(companyLinkEls);
		const href = companyLinkEl.getAttribute("href");
		if (!href) {
			throw new Error("Company link href is empty");
		}
		console.log(`Company link href: ${href}`);
		const companyName = extractCompanyName(href);
		if (!companyName) {
			throw new Error("Failed to extract company name from URL");
		}

		return companyName;
	}

	function getJobDescription() {
		const descriptionEls = Array.from(
			window.document.querySelectorAll<HTMLElement>(".description__text"),
		);
		if (descriptionEls.length === 0) {
			throw new Error("Description element not found");
		} else if (descriptionEls.length > 1) {
			throw new Error("Multiple description elements found");
		}
		const descriptionEl = firstOrThrow(descriptionEls);
		descriptionEl.querySelectorAll("button").forEach((el) => {
			el.remove();
		});

		const description = descriptionEl.innerText.trim();
		if (!description) {
			throw new Error("Description text is empty");
		}
		return description;
	}

	function getJobTitle() {
		const titleEls = Array.from(
			window.document.querySelectorAll(".top-card-layout__title"),
		);
		if (titleEls.length === 0) {
			throw new Error("Title element not found");
		} else if (titleEls.length > 1) {
			throw new Error("Multiple title elements found");
		}

		const titleEl = firstOrThrow(titleEls);

		const title = titleEl.textContent.trim();
		if (!title) {
			throw new Error("Title text is empty");
		}
		return title;
	}

	const data = {
		jobTitle,
		companyName,
		location,
		description,
	};
	const checksum = createChecksum(data);

	const existingDetail = await prisma.jobPostingDetail.findFirst({
		where: { jobPostingId: jobPosting.id },
	});

	const linkedinCompany =
		companyId && companyName
			? await prisma.linkedinCompany.upsert({
					where: { linkedinCompanyId: companyId },
					create: { linkedinCompanyId: companyId, companySlug: companyName },
					update: { companySlug: companyName },
				})
			: null;

	if (existingDetail && existingDetail.checksum === checksum) {
		console.log(
			`No changes detected for job posting ID ${jobPosting.id}. Skipping update.`,
		);
		return;
	}

	// Check if we already have this checksum stored
	// Can help avoid re-processing identical job postings across different jobs
	// (e.g., if the same job is reposted)
	const checksumMatch = await prisma.jobPostingDetail.findFirst({
		where: {
			checksum: checksum,
		},
		select: { json: true },
	});

	let jobExtractionData: JobExtraction;
	if (checksumMatch) {
		jobExtractionData = JobExtractionSchema.parse(checksumMatch.json);
	} else if (ENV.SKIP_JOB_ANALYZE) {
		jobExtractionData = await getJsonDataFromJobData(data);
	}

	await prisma.$transaction(async (tx) => {
		if (existingDetail) {
			await tx.jobPostingDetailHistory.create({
				data: {
					checksum: existingDetail.checksum,
					title: existingDetail.title,
					location: existingDetail.location,
					text: existingDetail.text,
					json: existingDetail.json as
						| Prisma.JsonNullValueInput
						| Prisma.InputJsonValue,
					jobPostingDetailId: existingDetail.id,
					linkedinCompanyId: linkedinCompany?.id ?? null,
				},
			});

			await tx.jobPostingDetail.update({
				where: { id: existingDetail.id },
				data: {
					checksum,
					json: jobExtractionData,
					text: data.description,
					location: data.location,
					title: data.jobTitle,
					linkedinCompanyId: linkedinCompany?.id ?? null,
				},
			});
		} else {
			await tx.jobPostingDetail.create({
				data: {
					jobPostingId: jobPosting.id,
					checksum,
					json: jobExtractionData,
					text: data.description,
					location: data.location,
					title: data.jobTitle,
					linkedinCompanyId: linkedinCompany?.id ?? null,
				},
			});
		}

		await tx.jobPosting.update({
			where: { id: jobPosting.id },
			data: { lastScrapedAt: new Date() },
		});
	});

	async function getJsonDataFromJobData(data: unknown): Promise<JobExtraction> {
		const schema = toJSONSchema(JobExtractionSchema);
		if (schema.type !== "object") {
			throw new Error("Schema root type is not object");
		}

		const toolSchema: Tool.InputSchema = {
			...schema,
			type: "object",
		};

		const parsed = await withRetry(
			async () => {
				const message = await anthropicClient.messages.create({
					model: "claude-sonnet-4-5",
					max_tokens: 8192,
					system: SYSTEM_PROMPT,
					messages: [
						{
							role: "user",
							content: `Extract the information from this job posting:\n\n${JSON.stringify(data, null, 2)}`,
						},
					],
					tools: [
						{
							name: "json",
							description: "Respond with a JSON object",
							input_schema: toolSchema,
						},
					],
					tool_choice: { type: "tool", name: "json" },
				});

				const toolUseBlock = message.content.find(
					(block): block is ToolUseBlock => block.type === "tool_use",
				);

				if (!toolUseBlock) {
					throw new Error("No tool use block found in the response");
				}

				if (toolUseBlock.name !== "json") {
					throw new Error(`Unexpected tool name: ${toolUseBlock.name}`);
				}

				const parseResult = JobExtractionSchema.safeParse(toolUseBlock.input);
				if (!parseResult.success) {
					await writeFile(
						"data.json",
						JSON.stringify(toolUseBlock.input, null, 2),
					);
					throw new Error("Failed to parse job extraction data");
				}

				return parseResult.data;
			},
			{
				maxAttempts: 2,
				initialDelay: 1000,
				maxDelay: 3000,
				retryCondition: (error) => {
					const shouldRetry =
						error instanceof Error &&
						error.message === "Failed to parse job extraction data";
					return { retry: shouldRetry };
				},
			},
		);

		return parsed;
	}
}
