import { jobType } from "./linkedinJobType.ts";
import type { LinkedinJobSearchInput } from "./linkedinSearchInput.ts";
import { workType } from "./linkedinWorkType.ts";

const JOB_SEARCH_URL = "https://www.linkedin.com/jobs/search";
const JOB_SEARCH_INCREMENTAL_URL =
	"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

export function createJobSearchUrl({
	input,
	isInitial,
}: {
	input: LinkedinJobSearchInput;
	isInitial: boolean;
}) {
	const url = new URL(isInitial ? JOB_SEARCH_URL : JOB_SEARCH_INCREMENTAL_URL);
	url.searchParams.set("keywords", input.query);
	url.searchParams.set("geoid", input.geoId.toString());
	url.searchParams.set("location", input.location);
	url.searchParams.set("f_TPR", `r${input.time}`);

	if (input.start) {
		url.searchParams.set("start", input.start.toString());
	}

	if (input.workType.length > 0) {
		url.searchParams.set(
			"f_WT",
			input.workType.map((type) => workType[type]).join(","),
		);
	}

	if (input.jobType.length > 0) {
		url.searchParams.set(
			"f_JT",
			input.jobType.map((type) => jobType[type]).join(","),
		);
	}

	if (input.companyIds && input.companyIds.length > 0) {
		url.searchParams.set(
			"f_C",
			input.companyIds.map((id) => id.toString()).join(","),
		);
	}

	return url.toString();
}
