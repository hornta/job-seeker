export const jobType: Record<string, string> = {
	"full-time": "F",
	"part-time": "P",
	contract: "C",
	temporary: "T",
	volunteer: "V",
	internship: "I",
};

export type JobType = keyof typeof jobType;
