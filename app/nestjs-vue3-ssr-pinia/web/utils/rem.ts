(function flexible(window, document) {
	const docEl = document.documentElement;
	// const dpr = window.devicePixelRatio || 1

	// adjust body font size
	// function setBodyFontSize() {
	//   if (document.body) {
	//     document.body.style.fontSize = 12 * dpr + 'px'
	//   } else {
	//     document.addEventListener('DOMContentLoaded', setBodyFontSize)
	//   }
	// }
	// setBodyFontSize()
	function setBodyFontSize() {
		if (document.body) {
			document.body.style.fontSize = 12 + "px";
		} else {
			document.addEventListener("DOMContentLoaded", setBodyFontSize);
		}
	}
	setBodyFontSize();

	function setRemUnit() {
		const rem = (docEl.clientWidth >= 750 ? 750 : docEl.clientWidth) / 5;
		docEl.style.fontSize = rem + "px";
	}

	setRemUnit();

	// reset rem unit on page resize
	window.addEventListener("resize", setRemUnit);
	window.addEventListener("pageshow", function (e) {
		if (e.persisted) {
			setRemUnit();
		}
	});

	// detect 0.5px supports
	// if (dpr >= 2) {
	//   const fakeBody = document.createElement('body')
	//   const testElement = document.createElement('div')
	//   testElement.style.border = '.5px solid transparent'
	//   fakeBody.appendChild(testElement)
	//   docEl.appendChild(fakeBody)
	//   if (testElement.offsetHeight === 1) {
	//     docEl.classList.add('hairlines')
	//   }
	//   docEl.removeChild(fakeBody)
	// }
})(window, document);
