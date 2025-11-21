// Get a single element by selector, throw if not found or multiple found
export function getElement(window: Window, selector: string): Element {
	const elements = window.document.querySelectorAll(selector);

	if (elements.length === 0) {
		throw new Error(`No elements found for selector: ${selector}`);
	}

	if (elements.length > 1) {
		throw new Error(`Multiple elements found for selector: ${selector}`);
	}

	return elements[0];
}

// Find a single element by selector, return null if not found, throw if multiple found
export function findElement(window: Window, selector: string): Element | null {
	const elements = window.document.querySelectorAll(selector);

	if (elements.length > 1) {
		throw new Error(`Multiple elements found for selector: ${selector}`);
	}

	return elements.length === 0 ? null : elements[0];
}

// Get attribute value or throw if not found or empty
export function getAttributeOrThrow(
	element: Element,
	attributeName: string,
): string {
	const attributeValue = element.getAttribute(attributeName);
	if (attributeValue === null) {
		throw new Error(`Attribute ${attributeName} not found on element`);
	}

	const trimmed = attributeValue.trim();
	if (trimmed === "") {
		throw new Error(`Attribute ${attributeName} is empty on element`);
	}

	return attributeValue;
}

// Get text content or throw if empty
export function getTextOrThrowIfEmpty(element: Element): string {
	const text = element.textContent.trim();
	if (!text) {
		throw new Error("Element text is empty");
	}
	return text;
}
