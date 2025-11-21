import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const SYSTEM_PROMPT = await readFile(
	resolve(import.meta.dirname, "./systemPrompt.txt"),
	{
		encoding: "utf-8",
	},
);
