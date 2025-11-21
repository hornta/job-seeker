import { checkbox } from "@inquirer/prompts";
import { jobs } from "./jobs.ts";

const selectedTasks = await checkbox({
	message: "Select which tasks to run:",
	choices: jobs.map(([, job]) => {
		return { value: job.name };
	}),
});

for (const [, job] of jobs) {
	if (selectedTasks.includes(job.name)) {
		job.trigger();
	}
}
