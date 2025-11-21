export const workType: Record<string, string> = {
	"on-site": "1",
	remote: "2",
	hybrid: "3",
};

export type WorkType = keyof typeof workType;
