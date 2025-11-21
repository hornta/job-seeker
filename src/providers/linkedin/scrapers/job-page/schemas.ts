import z from "zod";

const VisaSponsorshipStatusSchema = z.enum([
	"explicitly_available",
	"explicitly_not_available",
	"not_mentioned",
]);

const VisaTimingSchema = z.enum([
	"immediate",
	"after_probation",
	"after_6_months",
	"after_1_year",
	"not_specified",
]);

const VisaSponsorshipDetailsSchema = z
	.object({
		will_sponsor_new: z.boolean().nullable(),
		will_transfer_existing: z.boolean().nullable(),
		visa_types: z
			.array(z.string())
			.describe("e.g., ['H-1B', 'O-1', 'TN', 'L-1']"),
		geographic_restrictions: z
			.array(z.string())
			.describe("Countries or regions, e.g., ['any country', 'Canada', 'EU']"),
		timing: VisaTimingSchema.nullable(),
		relocation_assistance: z.boolean().nullable(),
		relocation_package: z
			.string()
			.nullable()
			.describe("Description of relocation benefits"),
		notes: z
			.string()
			.nullable()
			.describe("Any additional context about visa sponsorship"),
	})
	.nullable();

const VisaSponsorshipSchema = z.object({
	status: VisaSponsorshipStatusSchema.describe(
		"Whether visa sponsorship is explicitly available, not available, or not mentioned",
	),
	details: VisaSponsorshipDetailsSchema.describe(
		"Detailed information if sponsorship is available",
	),
	work_authorization_required: z
		.boolean()
		.nullable()
		.describe("Whether existing work authorization is required"),
	citizenship_requirements: z
		.array(z.string())
		.nullable()
		.describe("e.g., ['US citizen', 'Green card holder', 'EAD holder']"),
});

const SkillItemSchema = z.object({
	name: z.string().describe("Name of the technology/skill"),
	required: z.boolean().describe("Whether this skill is required or preferred"),
	years_experience: z
		.number()
		.nullable()
		.describe("Years of experience required/preferred for this skill"),
});

const TechnicalRequirementsSchema = z.object({
	programming_languages: z
		.array(SkillItemSchema)
		.describe("Programming languages mentioned in the job posting"),
	frameworks: z.array(SkillItemSchema).describe("Frameworks and libraries"),
	tools_platforms: z
		.array(SkillItemSchema)
		.describe("Tools, platforms, cloud providers, DevOps tools, etc."),
	databases: z
		.array(SkillItemSchema)
		.describe("Databases and data storage technologies"),
	other_technical_skills: z
		.array(SkillItemSchema)
		.describe(
			"Any other domain-specific or technical skills not covered above",
		),
});

export const JobExtractionSchema = z.object({
	visa_sponsorship: VisaSponsorshipSchema,
	technical_requirements: TechnicalRequirementsSchema,
});

export type JobExtraction = z.infer<typeof JobExtractionSchema>;
