import type { JobType } from "./linkedinJobType.ts";
import type { WorkType } from "./linkedinWorkType.ts";

export type LinkedinJobSearchInput = {
	query: string;
	geoId: number;
	location: string;
	workType: WorkType[];
	jobType: JobType[];
	time: number;
	start?: number;
	companyIds?: number[];
};
