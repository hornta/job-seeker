/**
 * Extracts the job ID from a LinkedIn job URL path
 * @param path - The URL path (e.g., "/jobs/view/front-end-engineer-at-alpha-4321239965")
 * @returns The numeric job ID or null if not found
 */
export const extractJobId = (path: string): string | null => {
	const lastHyphenIndex = path.lastIndexOf("-");
	if (lastHyphenIndex === -1) return null;

	const id = path.substring(lastHyphenIndex + 1);

	// Verify it's numeric
	if (/^\d+$/.test(id)) {
		return id;
	}

	return null;
};

/**
 * Extracts the job ID from a LinkedIn URN
 * @param urn - The URN string (e.g., "urn:li:jobPosting:4260453597")
 * @returns The numeric job ID or null if not found
 */
export const extractJobIdFromUrn = (urn: string) => {
	const parts = urn.split(":");

	// URN format should be: urn:li:jobPosting:JOBID
	if (
		parts.length === 4 &&
		parts[0] === "urn" &&
		parts[1] === "li" &&
		parts[2] === "jobPosting"
	) {
		const id = parts[3];
		// Verify it's numeric
		if (/^\d+$/.test(id)) {
			const num = BigInt(id);
			return num;
		}
	}

	return null;
};

/**
 * Extracts the company name from a LinkedIn company, showcase, or school URL
 * @param url - The company URL (e.g., "https://www.linkedin.com/company/try-glimpse?trk=public_jobs_topcard-org-name")
 *              showcase URL (e.g., "https://www.linkedin.com/showcase/acrisure-technology-group/")
 *              or school URL (e.g., "https://www.linkedin.com/school/university-of-rochester/")
 * @returns The company/showcase/school name (e.g., "try-glimpse", "acrisure-technology-group", or "university-of-rochester") or null if not found
 */
export const extractCompanyName = (url: string): string | null => {
	try {
		const urlObj = new URL(url);
		const pathParts = urlObj.pathname.split("/").filter(Boolean);

		// LinkedIn company URLs follow the pattern: /company/{company-name}
		// LinkedIn showcase URLs follow the pattern: /showcase/{showcase-name}
		// LinkedIn school URLs follow the pattern: /school/{school-name}
		if (
			pathParts.length >= 2 &&
			(pathParts[0] === "company" ||
				pathParts[0] === "showcase" ||
				pathParts[0] === "school")
		) {
			return pathParts[1];
		}

		return null;
	} catch {
		// Invalid URL
		return null;
	}
};
