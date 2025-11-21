import { jobs } from "./jobs.ts";

for (const [, job] of jobs) {
	job.resume();
	job.trigger();
}
