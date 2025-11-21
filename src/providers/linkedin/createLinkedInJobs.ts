import { Cron } from "croner";
import { EVERY_5_MINUTES } from "../../constants.ts";
import { scrapeCompaniesTask } from "./tasks/scrapeCompaniesTask.ts";
import { discoverJobIdsTask } from "./tasks/scrapeJobsSearchTask.ts";
import { scrapeJobsTask } from "./tasks/scrapeJobsTask.ts";

export const createLinkedInJobs = () => {
	const discoverJobsJob = new Cron(
		"0 * * * *",
		{ protect: true, name: "discoverJobsJob" },
		discoverJobIdsTask,
	);

	const scrapeLinkedInJobsJob = new Cron(
		EVERY_5_MINUTES,
		{ protect: true, name: "scrapeLinkedInJobsJob" },
		scrapeJobsTask,
	);

	const scrapeLinkedinCompaniesJob = new Cron(
		EVERY_5_MINUTES,
		{ protect: true, name: "scrapeLinkedinCompaniesJob" },
		scrapeCompaniesTask,
	);

	return {
		discoverJobsJob,
		scrapeLinkedInJobsJob,
		scrapeLinkedinCompaniesJob,
	};
};
