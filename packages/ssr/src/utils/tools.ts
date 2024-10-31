export const debounce = (func: () => void, wait: number) => {
	let timer;
	return () => {
		clearTimeout(timer);
		timer = setTimeout(func, wait);
	};
};
