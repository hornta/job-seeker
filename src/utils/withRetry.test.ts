import { describe, expect, it, vi } from "vitest";

import {
	ABORT_RETRY,
	exponentialBackoff,
	fixedBackoff,
	linearBackoff,
	withRandomness,
	withRetry,
} from "./withRetry.js";

describe("withRetry", () => {
	it("should succeed immediately without retries", async () => {
		const operation = vi.fn().mockResolvedValue("success");
		const result = await withRetry(operation);

		expect(result).toBe("success");
		expect(operation).toHaveBeenCalledTimes(1);
	});

	it("should support synchronous operations", async () => {
		const operation = vi.fn().mockReturnValue("success");
		const result = await withRetry(operation);

		expect(result).toBe("success");
		expect(operation).toHaveBeenCalledTimes(1);
	});

	it("should maintain correct typescript types", async () => {
		const operation = vi.fn<() => string>().mockResolvedValue("success");
		const result = await withRetry(operation);

		expect(result.toUpperCase()).toBe("SUCCESS");
	});

	it("should retry until success within maxAttempts", async () => {
		const operation = vi
			.fn()
			.mockRejectedValueOnce(new Error("fail"))
			.mockRejectedValueOnce(new Error("fail"))
			.mockResolvedValue("success");

		const onRetry = vi.fn();

		const result = await withRetry(operation, {
			maxAttempts: 3,
			initialDelay: 10,
			onRetry,
		});

		expect(result).toBe("success");
		expect(operation).toHaveBeenCalledTimes(3);
		expect(onRetry).toHaveBeenCalledTimes(2);
	});

	it("should handle synchronous failures", async () => {
		const operation = vi
			.fn()
			.mockImplementationOnce(() => {
				throw new Error("fail");
			})
			.mockImplementationOnce(() => {
				throw new Error("fail");
			})
			.mockReturnValue("success");

		const onRetry = vi.fn();
		const result = await withRetry(operation, {
			maxAttempts: 3,
			initialDelay: 10,
			onRetry,
		});

		expect(result).toBe("success");
		expect(operation).toHaveBeenCalledTimes(3);
		expect(onRetry).toHaveBeenCalledTimes(2);
	});

	it("should call onFailure and throw after maxAttempts", async () => {
		const error = new Error("fail");
		const operation = vi.fn().mockRejectedValue(error);
		const onFailure = vi.fn();

		await expect(
			withRetry(operation, {
				maxAttempts: 3,
				onFailure,
				initialDelay: 10,
			}),
		).rejects.toThrow("fail");

		expect(operation).toHaveBeenCalledTimes(3);
		expect(onFailure).toHaveBeenCalledTimes(1);
		expect(onFailure).toHaveBeenCalledWith(error, 3);
	});

	it("should respect retryCondition", async () => {
		const operation = vi.fn().mockRejectedValue(new Error("fail"));
		const retryCondition = vi.fn().mockReturnValue({ retry: false });

		await expect(
			withRetry(operation, {
				retryCondition,
				initialDelay: 10,
			}),
		).rejects.toThrow("fail");

		expect(operation).toHaveBeenCalledTimes(1);
		expect(retryCondition).toHaveBeenCalledTimes(1);
	});

	it("should call onRetry with correct parameters", async () => {
		const error = new Error("fail");
		const operation = vi.fn().mockRejectedValue(error);
		const onRetry = vi.fn();
		const backoff = vi.fn().mockReturnValue(100);

		await expect(
			withRetry(operation, {
				maxAttempts: 2,
				onRetry,
				backoff,
				initialDelay: 10,
			}),
		).rejects.toThrow("fail");

		expect(onRetry).toHaveBeenCalledWith(error, 1, 100);
	});

	it("should support async onRetry callbacks", async () => {
		const operation = vi
			.fn()
			.mockRejectedValueOnce(new Error("fail"))
			.mockResolvedValue("success");

		const onRetry = vi.fn().mockImplementation(() => {
			return new Promise((resolve) => {
				return setTimeout(resolve, 10);
			});
		});

		const result = await withRetry(operation, {
			maxAttempts: 2,
			onRetry,
			initialDelay: 10,
		});

		expect(result).toBe("success");
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("should have correctly typed return value", async () => {
		const resolveToAString = vi.fn<() => string>().mockResolvedValue("success");
		const result = await withRetry(resolveToAString);
		expect(result.toUpperCase()).toBe("SUCCESS");
	});

	it("should use custom delay when retryCondition returns delay", async () => {
		const operation = vi
			.fn()
			.mockRejectedValueOnce(new Error("fail"))
			.mockResolvedValue("success");

		const customDelay = 500;
		const retryCondition = vi
			.fn()
			.mockReturnValue({ retry: true, delay: customDelay });
		const onRetry = vi.fn();
		const backoff = vi.fn().mockReturnValue(9999); // Should be ignored

		const result = await withRetry(operation, {
			maxAttempts: 2,
			retryCondition,
			onRetry,
			backoff,
			initialDelay: 10,
		});

		expect(result).toBe("success");
		expect(backoff).not.toHaveBeenCalled(); // Backoff should not be called when custom delay is provided
		expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, customDelay);
	});

	it("should use backoff when retryCondition returns retry without delay", async () => {
		const operation = vi
			.fn()
			.mockRejectedValueOnce(new Error("fail"))
			.mockResolvedValue("success");

		const retryCondition = vi.fn().mockReturnValue({ retry: true });
		const onRetry = vi.fn();
		const backoff = vi.fn().mockReturnValue(100);

		const result = await withRetry(operation, {
			maxAttempts: 2,
			retryCondition,
			onRetry,
			backoff,
			initialDelay: 10,
		});

		expect(result).toBe("success");
		expect(backoff).toHaveBeenCalledWith(10, 1, expect.any(Number));
		expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 100);
	});

	it("should not retry when retryCondition returns retry: false", async () => {
		const operation = vi.fn().mockRejectedValue(new Error("fail"));
		const retryCondition = vi.fn().mockReturnValue({ retry: false });
		const onRetry = vi.fn();

		await expect(
			withRetry(operation, {
				maxAttempts: 3,
				retryCondition,
				onRetry,
				initialDelay: 10,
			}),
		).rejects.toThrow("fail");

		expect(operation).toHaveBeenCalledTimes(1);
		expect(onRetry).not.toHaveBeenCalled();
	});

	it("should allow dynamic delay based on error", async () => {
		const error1 = new Error("rate limited");
		const error2 = new Error("server error");
		const operation = vi
			.fn()
			.mockRejectedValueOnce(error1)
			.mockRejectedValueOnce(error2)
			.mockResolvedValue("success");

		const retryCondition = vi.fn((error: unknown) => {
			if (Error.isError(error) && error.message === "rate limited") {
				return { retry: true, delay: 1000 }; // Longer delay for rate limit
			}
			return { retry: true, delay: 100 }; // Shorter delay for other errors
		});

		const onRetry = vi.fn();

		const result = await withRetry(operation, {
			maxAttempts: 3,
			retryCondition,
			onRetry,
			initialDelay: 10,
		});

		expect(result).toBe("success");
		expect(onRetry).toHaveBeenCalledTimes(2);
		expect(onRetry).toHaveBeenNthCalledWith(1, error1, 1, 1000);
		expect(onRetry).toHaveBeenNthCalledWith(2, error2, 2, 100);
	});

	describe("ABORT_RETRY", () => {
		it("should immediately abort retry logic when ABORT_RETRY is thrown", async () => {
			const operation = vi.fn().mockRejectedValue(ABORT_RETRY);
			const onRetry = vi.fn();
			const onFailure = vi.fn();

			await expect(
				withRetry(operation, {
					maxAttempts: 3,
					onRetry,
					onFailure,
					initialDelay: 10,
				}),
			).rejects.toBe(ABORT_RETRY);

			expect(operation).toHaveBeenCalledTimes(1);
			expect(onRetry).not.toHaveBeenCalled();
			expect(onFailure).not.toHaveBeenCalled();
		});

		it("should abort on second attempt when ABORT_RETRY is thrown mid-retry", async () => {
			const operation = vi
				.fn()
				.mockRejectedValueOnce(new Error("normal error"))
				.mockRejectedValue(ABORT_RETRY);

			const onRetry = vi.fn();
			const onFailure = vi.fn();

			await expect(
				withRetry(operation, {
					maxAttempts: 5,
					onRetry,
					onFailure,
					initialDelay: 10,
				}),
			).rejects.toBe(ABORT_RETRY);

			expect(operation).toHaveBeenCalledTimes(2);
			expect(onRetry).toHaveBeenCalledTimes(1); // Called after first error, before ABORT_RETRY
			expect(onRetry).toHaveBeenCalledWith(
				expect.objectContaining({ message: "normal error" }),
				1,
				expect.any(Number),
			);
			expect(onFailure).not.toHaveBeenCalled();
		});

		it("should abort immediately even when retryCondition would allow retry", async () => {
			const operation = vi.fn().mockRejectedValue(ABORT_RETRY);
			const retryCondition = vi.fn().mockReturnValue({ retry: true });
			const onRetry = vi.fn();

			await expect(
				withRetry(operation, {
					maxAttempts: 3,
					retryCondition,
					onRetry,
					initialDelay: 10,
				}),
			).rejects.toBe(ABORT_RETRY);

			expect(operation).toHaveBeenCalledTimes(1);
			expect(retryCondition).not.toHaveBeenCalled(); // ABORT_RETRY bypasses retryCondition
			expect(onRetry).not.toHaveBeenCalled();
		});

		it("should handle synchronous ABORT_RETRY throws", async () => {
			const operation = vi.fn().mockImplementation(() => {
				throw ABORT_RETRY;
			});

			const onRetry = vi.fn();
			const onFailure = vi.fn();

			await expect(
				withRetry(operation, {
					maxAttempts: 3,
					onRetry,
					onFailure,
					initialDelay: 10,
				}),
			).rejects.toBe(ABORT_RETRY);

			expect(operation).toHaveBeenCalledTimes(1);
			expect(onRetry).not.toHaveBeenCalled();
			expect(onFailure).not.toHaveBeenCalled();
		});

		it("should abort immediately without waiting for any delay", async () => {
			const startTime = Date.now();
			const operation = vi.fn().mockRejectedValue(ABORT_RETRY);

			await expect(
				withRetry(operation, {
					maxAttempts: 3,
					initialDelay: 5000, // Long delay that would be used if it wasn't ABORT_RETRY
				}),
			).rejects.toBe(ABORT_RETRY);

			const duration = Date.now() - startTime;

			// Should complete immediately without waiting for any delay
			expect(duration).toBeLessThan(100);
		});
	});

	describe("withRandomness", () => {
		it("should not modify delay when randomnessFactor is 0", () => {
			const mockBackoff = vi.fn().mockReturnValue(1000);
			const randomizedBackoff = withRandomness(mockBackoff, 0);

			const delay = randomizedBackoff(100, 1, 5000);

			expect(delay).toBe(1000);
			expect(mockBackoff).toHaveBeenCalledWith(100, 1, 5000);
		});

		it("should apply maximum positive jitter when Math.random returns 1", () => {
			vi.spyOn(Math, "random").mockReturnValue(1);
			const baseDelay = 1000;
			const mockBackoff = vi.fn().mockReturnValue(baseDelay);
			const randomnessFactor = 0.5;

			const randomizedBackoff = withRandomness(mockBackoff, randomnessFactor);
			const delay = randomizedBackoff(100, 1, 5000);

			expect(delay).toBe(baseDelay * (1 + randomnessFactor));
		});

		it("should apply maximum negative jitter when Math.random returns 0", () => {
			vi.spyOn(Math, "random").mockReturnValue(0);
			const baseDelay = 1000;
			const mockBackoff = vi.fn().mockReturnValue(baseDelay);
			const randomnessFactor = 0.5;

			const randomizedBackoff = withRandomness(mockBackoff, randomnessFactor);
			const delay = randomizedBackoff(100, 1, 5000);

			expect(delay).toBe(baseDelay * (1 - randomnessFactor));
		});

		it("should respect maxDelay even with maximum positive jitter", () => {
			vi.spyOn(Math, "random").mockReturnValue(1);
			const baseDelay = 4000;
			const maxDelay = 5000;
			const mockBackoff = vi.fn().mockReturnValue(baseDelay);
			const randomnessFactor = 0.5;

			const randomizedBackoff = withRandomness(mockBackoff, randomnessFactor);
			const delay = randomizedBackoff(100, 1, maxDelay);

			expect(delay).toBe(maxDelay);
		});

		it("should generate delays within the expected range", () => {
			const baseDelay = 1000;
			const mockBackoff = vi.fn().mockReturnValue(baseDelay);
			const randomnessFactor = 0.3;
			const randomizedBackoff = withRandomness(mockBackoff, randomnessFactor);

			for (let i = 0; i < 100; i++) {
				const delay = randomizedBackoff(100, 1, 5000);
				expect(delay).toBeGreaterThanOrEqual(
					baseDelay * (1 - randomnessFactor),
				);
				expect(delay).toBeLessThanOrEqual(baseDelay * (1 + randomnessFactor));
			}
		});
	});

	describe("backoff functions", () => {
		describe("linearBackoff", () => {
			const initialDelay = 1000;
			const maxDelay = 5000;

			it("should scale linearly with attempt number", () => {
				expect(linearBackoff(initialDelay, 1, maxDelay)).toBe(1000); // 1000 * 1
				expect(linearBackoff(initialDelay, 2, maxDelay)).toBe(2000); // 1000 * 2
				expect(linearBackoff(initialDelay, 3, maxDelay)).toBe(3000); // 1000 * 3
			});

			it("should respect maxDelay", () => {
				expect(linearBackoff(initialDelay, 6, maxDelay)).toBe(5000); // Would be 6000, but capped at 5000
				expect(linearBackoff(initialDelay, 10, maxDelay)).toBe(5000); // Would be 10000, but capped at 5000
			});

			it("should handle different initial delays", () => {
				expect(linearBackoff(2000, 2, maxDelay)).toBe(4000);
				expect(linearBackoff(500, 3, maxDelay)).toBe(1500);
			});
		});

		describe("exponentialBackoff", () => {
			const initialDelay = 1000;
			const maxDelay = 10000;

			it("should scale exponentially with attempt number", () => {
				expect(exponentialBackoff(initialDelay, 1, maxDelay)).toBe(1000); // 1000 * 2^0
				expect(exponentialBackoff(initialDelay, 2, maxDelay)).toBe(2000); // 1000 * 2^1
				expect(exponentialBackoff(initialDelay, 3, maxDelay)).toBe(4000); // 1000 * 2^2
				expect(exponentialBackoff(initialDelay, 4, maxDelay)).toBe(8000); // 1000 * 2^3
			});

			it("should respect maxDelay", () => {
				expect(exponentialBackoff(initialDelay, 5, maxDelay)).toBe(10000); // Would be 16000, but capped at 10000
				expect(exponentialBackoff(initialDelay, 6, maxDelay)).toBe(10000); // Would be 32000, but capped at 10000
			});

			it("should handle different initial delays", () => {
				expect(exponentialBackoff(2000, 2, maxDelay)).toBe(4000);
				expect(exponentialBackoff(500, 3, maxDelay)).toBe(2000);
			});

			it("should handle zero and negative attempts", () => {
				expect(exponentialBackoff(initialDelay, 0, maxDelay)).toBe(500); // 1000 * 2^-1
				expect(exponentialBackoff(initialDelay, -1, maxDelay)).toBe(250); // 1000 * 2^-2
			});
		});

		describe("fixedBackoff", () => {
			it("should always return the initial delay", () => {
				expect(fixedBackoff(1000)).toBe(1000);
				expect(fixedBackoff(2000)).toBe(2000);
				expect(fixedBackoff(5000)).toBe(5000);
			});
		});

		describe("edge cases for all backoff functions", () => {
			const maxDelay = 5000;

			it("should handle very small initial delays", () => {
				expect(linearBackoff(1, 3, maxDelay)).toBe(3);
				expect(exponentialBackoff(1, 3, maxDelay)).toBe(4);
				expect(fixedBackoff(1)).toBe(1);
			});

			it("should handle very large initial delays", () => {
				const largeDelay = 1000000;
				expect(linearBackoff(largeDelay, 1, maxDelay)).toBe(maxDelay);
				expect(exponentialBackoff(largeDelay, 1, maxDelay)).toBe(maxDelay);
				expect(fixedBackoff(largeDelay)).toBe(largeDelay);
			});

			it("should handle zero maxDelay", () => {
				expect(linearBackoff(1000, 3, 0)).toBe(0);
				expect(exponentialBackoff(1000, 3, 0)).toBe(0);
				// fixedBackoff doesn't use maxDelay
			});
		});

		describe("withRandomness", () => {
			it("should work with exponential backoff", () => {
				vi.spyOn(Math, "random").mockReturnValue(0.2);
				const randomizedExponential = withRandomness(exponentialBackoff, 0.1);

				const delay = randomizedExponential(1000, 2, 5000);

				// Base exponential: 2000 (1000 * 2^1)
				// Random factor: 1 + 0.1 * (2 * 0.2 - 1) = 0.94
				// Final: 2000 * 0.94 = 1880
				expect(delay).toBe(1880);
			});

			it("should work with linear backoff", () => {
				vi.spyOn(Math, "random").mockReturnValue(0.7);
				const randomizedLinear = withRandomness(linearBackoff, 0.1);

				const delay = randomizedLinear(1000, 2, 5000);

				// Base linear: 2000 (1000 * 2)
				// Random factor: 1 + 0.1 * (2 * 0.7 - 1) = 1.04
				// Final: 2000 * 1.04 = 2080
				expect(delay).toBe(2080);
			});
		});
	});
});
