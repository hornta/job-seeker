import { describe, expect, it } from "vitest";
import {
	extractCompanyName,
	extractJobId,
	extractJobIdFromUrn,
} from "./extractUtils.ts";

describe("extractJobId", () => {
	it("should extract job ID from a valid LinkedIn job path", () => {
		const path = "/jobs/view/front-end-engineer-at-alpha-4321239965";
		const result = extractJobId(path);
		expect(result).toBe("4321239965");
	});

	it("should extract job ID from path with multiple hyphens", () => {
		const path =
			"/jobs/view/senior-software-engineer-react-typescript-1234567890";
		const result = extractJobId(path);
		expect(result).toBe("1234567890");
	});

	it("should extract single digit job ID", () => {
		const path = "/jobs/view/some-job-5";
		const result = extractJobId(path);
		expect(result).toBe("5");
	});

	it("should return null when path has no hyphens", () => {
		const path = "/jobs/view/nohyphens";
		const result = extractJobId(path);
		expect(result).toBeNull();
	});

	it("should return null when last segment is not numeric", () => {
		const path = "/jobs/view/front-end-engineer-at-alpha";
		const result = extractJobId(path);
		expect(result).toBeNull();
	});

	it("should return null when last segment has mixed alphanumeric", () => {
		const path = "/jobs/view/front-end-engineer-abc123";
		const result = extractJobId(path);
		expect(result).toBeNull();
	});

	it("should return null for empty string", () => {
		const path = "";
		const result = extractJobId(path);
		expect(result).toBeNull();
	});

	it("should handle path ending with hyphen", () => {
		const path = "/jobs/view/some-job-";
		const result = extractJobId(path);
		expect(result).toBeNull();
	});

	it("should extract very long job IDs", () => {
		const path = "/jobs/view/position-12345678901234567890";
		const result = extractJobId(path);
		expect(result).toBe("12345678901234567890");
	});

	it("should handle path with trailing slash", () => {
		const path = "/jobs/view/engineer-123456/";
		const result = extractJobId(path);
		expect(result).toBeNull(); // '/' is not numeric
	});
});

describe("extractJobIdFromUrn", () => {
	it("should extract job ID from a valid LinkedIn URN", () => {
		const urn = "urn:li:jobPosting:4260453597";
		const result = extractJobIdFromUrn(urn);
		expect(result).toBe(4260453597n);
	});

	it("should extract different job ID from URN", () => {
		const urn = "urn:li:jobPosting:1234567890";
		const result = extractJobIdFromUrn(urn);
		expect(result).toBe(1234567890n);
	});

	it("should return null for invalid URN format", () => {
		const urn = "invalid:urn:format";
		const result = extractJobIdFromUrn(urn);
		expect(result).toBeNull();
	});

	it("should return null for URN with wrong namespace", () => {
		const urn = "urn:different:jobPosting:4260453597";
		const result = extractJobIdFromUrn(urn);
		expect(result).toBeNull();
	});

	it("should return null for URN with wrong entity type", () => {
		const urn = "urn:li:company:4260453597";
		const result = extractJobIdFromUrn(urn);
		expect(result).toBeNull();
	});

	it("should return null when job ID is not numeric", () => {
		const urn = "urn:li:jobPosting:abc123";
		const result = extractJobIdFromUrn(urn);
		expect(result).toBeNull();
	});

	it("should return null for empty string", () => {
		const urn = "";
		const result = extractJobIdFromUrn(urn);
		expect(result).toBeNull();
	});

	it("should return null for URN with too few parts", () => {
		const urn = "urn:li:jobPosting";
		const result = extractJobIdFromUrn(urn);
		expect(result).toBeNull();
	});

	it("should return null for URN with too many parts", () => {
		const urn = "urn:li:jobPosting:4260453597:extra";
		const result = extractJobIdFromUrn(urn);
		expect(result).toBeNull();
	});
});

describe("extractCompanyName", () => {
	it("should extract company name from a valid LinkedIn company URL", () => {
		const url =
			"https://www.linkedin.com/company/try-glimpse?trk=public_jobs_topcard-org-name";
		const result = extractCompanyName(url);
		expect(result).toBe("try-glimpse");
	});

	it("should extract company name without query parameters", () => {
		const url = "https://www.linkedin.com/company/microsoft";
		const result = extractCompanyName(url);
		expect(result).toBe("microsoft");
	});

	it("should extract company name with trailing slash", () => {
		const url = "https://www.linkedin.com/company/google/";
		const result = extractCompanyName(url);
		expect(result).toBe("google");
	});

	it("should handle company names with multiple hyphens", () => {
		const url = "https://www.linkedin.com/company/some-tech-company-inc";
		const result = extractCompanyName(url);
		expect(result).toBe("some-tech-company-inc");
	});

	it("should handle company names with numbers", () => {
		const url = "https://www.linkedin.com/company/company123";
		const result = extractCompanyName(url);
		expect(result).toBe("company123");
	});

	it("should return null for non-company LinkedIn URLs", () => {
		const url = "https://www.linkedin.com/jobs/view/123456";
		const result = extractCompanyName(url);
		expect(result).toBeNull();
	});

	it("should return null for invalid URLs", () => {
		const url = "not a valid url";
		const result = extractCompanyName(url);
		expect(result).toBeNull();
	});

	it("should return null for empty string", () => {
		const url = "";
		const result = extractCompanyName(url);
		expect(result).toBeNull();
	});

	it("should return null for company URL without company name", () => {
		const url = "https://www.linkedin.com/company/";
		const result = extractCompanyName(url);
		expect(result).toBeNull();
	});

	it("should handle HTTP URLs", () => {
		const url = "http://www.linkedin.com/company/test-company";
		const result = extractCompanyName(url);
		expect(result).toBe("test-company");
	});

	it("should handle URLs with additional path segments", () => {
		const url = "https://www.linkedin.com/company/acme-corp/about/";
		const result = extractCompanyName(url);
		expect(result).toBe("acme-corp");
	});

	it("should extract company name from LinkedIn showcase URLs", () => {
		const url =
			"https://www.linkedin.com/showcase/acrisure-technology-group/?trk=public_jobs_topcard-org-name";
		const result = extractCompanyName(url);
		expect(result).toBe("acrisure-technology-group");
	});

	it("should handle showcase URLs without query parameters", () => {
		const url = "https://www.linkedin.com/showcase/tech-showcase";
		const result = extractCompanyName(url);
		expect(result).toBe("tech-showcase");
	});

	it("should extract school name from LinkedIn school URLs", () => {
		const url =
			"https://www.linkedin.com/school/university-of-rochester/?trk=public_jobs_topcard-org-name";
		const result = extractCompanyName(url);
		expect(result).toBe("university-of-rochester");
	});

	it("should handle school URLs without query parameters", () => {
		const url = "https://www.linkedin.com/school/mit";
		const result = extractCompanyName(url);
		expect(result).toBe("mit");
	});
});
