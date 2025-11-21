import z from "zod";

const EnvSchema = z.object({
	DATABASE_URL: z.string().describe("Database connection string"),
	ANTHROPIC_API_KEY: z.string().optional().describe("Anthropic API key"),
	PORT: z.coerce.number().default(3000).describe("Web server port"),
	SKIP_JOB_ANALYZE: z.coerce
		.boolean()
		.default(false)
		.describe("Whether or not to analyze the job using LLM"),
});

export const ENV = EnvSchema.parse(process.env);
