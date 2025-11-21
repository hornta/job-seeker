# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a LinkedIn job scraper that collects job postings, extracts structured information using Claude AI, and stores them in a PostgreSQL database. The system runs on a scheduled basis to continuously monitor job postings.

## Commands

### Development
- `pnpm start` - Run the main cron job scheduler (scrapes job IDs every hour, processes postings every 5 minutes)
- `pnpm dev` - Run interactive mode (prompts which tasks to execute)
- `pnpm test` - Run tests in watch mode

### Database
- `npx prisma migrate dev` - Apply database migrations in development
- `npx prisma studio` - Open Prisma Studio to browse database
- `npx prisma generate` - Generate Prisma client after schema changes

### Code Quality
- `npx biome check` - Run linter and formatter checks
- `npx biome check --write` - Fix linting and formatting issues
- `npx biome format --write` - Format code only

## Architecture

### Two-Phase Job Processing Pipeline

1. **Phase 1: Job ID Scraping** (`scraper.ts`)
   - Scrapes LinkedIn job search results to collect job IDs
   - Uses `linkedom` to parse HTML and extract job URNs
   - Implements pagination with a 1000-job limit
   - Uses retry logic with exponential backoff for network requests
   - Stores job IDs in `JobPosting` table

2. **Phase 2: Job Processing** (`process.ts`)
   - Fetches full job posting HTML for unprocessed/stale jobs
   - Extracts metadata: title, company ID/name, location, description
   - Uses Claude AI to extract structured data (visa sponsorship, technical requirements)
   - Implements checksum-based change detection to avoid unnecessary updates
   - Stores detailed data in `JobPostingDetail` table
   - Maintains history in `JobPostingDetailHistory` when postings change

### Data Flow

```
scrapeJobIdsTask() → JobPosting records created
                     ↓
processJobPostingsTask() → fetches postings where lastScrapedAt is null or > 24h old
                          ↓
                     processes up to 10 postings per run
                          ↓
                     Claude AI extracts structured data
                          ↓
                     saves to JobPostingDetail (with checksum-based deduplication)
```

### Key Components

- **tasks.ts**: High-level task orchestration and search query configuration
  - `input` object defines the job search parameters (query, location, work type, etc.)
  - `scrapeJobIdsTask()` - orchestrates job ID scraping
  - `processJobPostingsTask()` - orchestrates job processing (10 at a time, prioritizes stale/unprocessed)

- **scraper.ts**: HTML scraping and job ID extraction
  - Constructs LinkedIn search URLs with filters
  - Parses job listing pages to extract job URNs

- **process.ts**: Job posting detail extraction
  - Fetches individual job posting HTML
  - Extracts structured data using DOM selectors
  - Uses Claude AI for intelligent extraction via tool-use pattern
  - Implements atomic database updates with transactions

- **schemas.ts**: Zod schemas for AI extraction
  - `JobExtractionSchema` defines visa sponsorship and technical requirements structure
  - Used to generate JSON schema for Claude's tool-use API

- **utils.ts**: URL construction, ID extraction, checksum generation
  - `makeSearchUrl()` builds LinkedIn search URLs with all filters
  - `extractJobIdFromUrn()` parses LinkedIn URNs
  - `createChecksum()` generates SHA-256 hashes for change detection

- **withRetry.ts**: Configurable retry mechanism with backoff strategies

- **startWebServer.ts**: Fastify web server for API access
  - Provides REST API endpoints for querying job postings
  - `serializeBigInt()` helper function converts BigInt values to strings for JSON serialization
  - IMPORTANT: All endpoints that return database records must use `serializeBigInt()` to handle BigInt fields
  - Never use monkey patching (e.g., `BigInt.prototype.toJSON`) for serialization

### BigInt Serialization

The database schema uses BigInt for `linkedInJobId` fields. JavaScript's `JSON.stringify()` cannot serialize BigInt values by default, which causes errors in API responses.

**Solution**: Use the `serializeBigInt()` helper function to recursively convert BigInt values to strings before returning API responses.

**Implementation Pattern**:
```typescript
// BAD - Will cause "Do not know how to serialize a BigInt" error
return { data: jobs };

// GOOD - Converts BigInt values to strings
return serializeBigInt({ data: jobs });
```

The `serializeBigInt()` function:
- Recursively traverses objects and arrays
- Converts BigInt values to strings
- Preserves all other data types unchanged
- Must be applied to all API endpoint responses that include database records

### Database Schema

- `JobPosting` - stores job IDs and scraping metadata
- `JobPostingDetail` - stores extracted job information (1:1 with JobPosting)
- `JobPostingDetailHistory` - archives previous versions when jobs change
- `LinkedinCompany` - normalizes company data across postings
- `JobFilter` - planned feature for configurable search filters (not yet implemented)

### AI Integration

The system uses Claude AI (claude-sonnet-4-5) via the Anthropic SDK with:
- Structured output via tool-use pattern (forces JSON schema compliance)
- System prompt from `systemPrompt.txt`
- Extracts visa sponsorship details and technical skill requirements
- Validates output with Zod schemas before database insertion

## Environment Setup

Required environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string (supports Prisma Accelerate)
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude AI

## Code Style

- TypeScript with strict mode enabled
- Uses native Node.js type stripping (`--experimental-strip-types`)
- ES modules with `.ts` extensions in imports
- Tab indentation, double quotes (enforced by Biome)
- Comprehensive error handling with descriptive messages

## Modifying Search Parameters

To change what jobs are scraped, edit the `input` object in `tasks.ts`:
- `query` - Boolean search query (e.g., `'("react" OR "typescript")'`)
- `geoId` - LinkedIn geographic ID
- `location` - Human-readable location name
- `workType` - Array of: `"on-site"`, `"remote"`, `"hybrid"`
- `jobType` - Array of: `"full-time"`, `"part-time"`, `"contract"`, etc.
- `time` - Time window in seconds (2592000 = 30 days)
- `companyIds` - Optional array of LinkedIn company IDs to filter

## Testing

Tests use Vitest. Current coverage includes:
- `withRetry.test.ts` - retry logic and backoff strategies
- `utils.test.ts` - utility functions
