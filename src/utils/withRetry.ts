import { sleep } from "./sleep.ts";

type BackoffFunction = (
	initialDelay: number,
	attempt: number,
	maxDelay: number,
) => number;

type RetryConditionResult = { retry: boolean; delay?: number };

export const ABORT_RETRY = Symbol("AbortRetry");

export interface WithRetryOptions {
	maxAttempts: number;
	initialDelay: number;
	maxDelay: number;
	retryCondition: (exception: unknown) => RetryConditionResult;
	onRetry: (
		exception: unknown,
		attempt: number,
		delay: number,
	) => Promise<void> | void;
	onFailure: (exception: unknown, attempt: number) => void;
	backoff: BackoffFunction;
}

const defaultOptions: WithRetryOptions = {
	maxAttempts: 3,
	initialDelay: 1000,
	maxDelay: 5000,
	backoff: exponentialBackoff,
	retryCondition: () => {
		return { retry: true };
	},
	onFailure: () => {},
	onRetry: () => {},
};

export const withRetry = async <TReturn>(
	operation: () => TReturn,
	options?: Partial<WithRetryOptions> | undefined,
): Promise<TReturn> => {
	const {
		backoff,
		onRetry,
		onFailure,
		initialDelay,
		maxAttempts,
		maxDelay,
		retryCondition,
	} = { ...defaultOptions, ...options };

	let attempt = 1;

	while (attempt <= maxAttempts) {
		try {
			const result = await Promise.resolve(operation());
			return result;
		} catch (error) {
			if (error === ABORT_RETRY) {
				throw error;
			}

			const retryResult = retryCondition(error);
			if (!retryResult.retry || attempt === maxAttempts) {
				onFailure(error, attempt);
				throw error;
			}

			const delay =
				retryResult.delay ?? backoff(initialDelay, attempt, maxDelay);

			await onRetry(error, attempt, delay);
			await sleep(delay);

			attempt++;
		}
	}

	throw new Error("Unreachable code");
};

export function linearBackoff(
	initialDelay: number,
	attempt: number,
	maxDelay: number,
) {
	return Math.min(initialDelay * attempt, maxDelay);
}

export function exponentialBackoff(
	initialDelay: number,
	attempt: number,
	maxDelay: number,
) {
	return Math.min(initialDelay * 2 ** (attempt - 1), maxDelay);
}

export function fixedBackoff(initialDelay: number) {
	return initialDelay;
}

/**
 * Adds randomness to any backoff strategy
 * @param backoff The base backoff strategy to add randomness to
 * @param randomnessFactor A number between 0 and 1 representing the maximum deviation from the base delay
 * @returns A new backoff function with randomness applied
 */
export function withRandomness(
	backoff: BackoffFunction,
	randomnessFactor: number,
): BackoffFunction {
	return (initialDelay: number, attempt: number, maxDelay: number) => {
		const baseDelay = backoff(initialDelay, attempt, maxDelay);
		// Generate a random factor between (1 - randomnessFactor) and (1 + randomnessFactor)
		const randomFactor = 1 + (Math.random() - 0.5) * 2 * randomnessFactor;
		return Math.min(baseDelay * randomFactor, maxDelay);
	};
}
