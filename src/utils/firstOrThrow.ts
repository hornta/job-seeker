export function firstOrThrow<T>(iterable: T[]): T {
	const first = iterable[0];
	if (first === undefined) {
		throw new Error("Iterable is empty");
	}
	return first;
}
