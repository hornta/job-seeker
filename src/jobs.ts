import { createLinkedInJobs } from "./providers/linkedin/createLinkedInJobs.ts";

export const jobs = Object.entries({
	...createLinkedInJobs(),
});

for (const [, job] of jobs) {
	job.pause();
}
