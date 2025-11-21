import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "../env.ts";

export const anthropicClient = new Anthropic({
	apiKey: ENV.ANTHROPIC_API_KEY,
});
