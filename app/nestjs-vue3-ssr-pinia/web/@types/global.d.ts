import { IWindow } from "kdssr";

declare global {
	interface Window extends IWindow {}
	const __isBrowser__: boolean;
}
