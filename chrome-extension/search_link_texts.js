(() => {
	if (window.isAlreadyPrepared) return;
	window.isAlreadyPrepared = true;

	let latestContextMenuTriggeredAnchorElement = null;
	document.addEventListener("contextmenu", evt => {
		latestContextMenuTriggeredAnchorElement = evt.path.find(e => e.tagName === "A");
	}, /* useCapture = */ true);

	const uniq = array => {
		// 重複を除去する
		return Array.from(new Set(array));
	};

	const searchLinkTexts = linkUrl => {
		const links = document.getElementsByTagName("a");
		return Array.from(links).filter(link => {
			return link.href === linkUrl;
		}).map(link => {
			return link.innerText.trim();
		}).filter(linkText => {
			return linkText;
		});
	};
	chrome.runtime.onMessage.addListener(request => {
		if (request.method === "searchLinkTexts") {
			const linkUrl = request.linkUrl;
			if (latestContextMenuTriggeredAnchorElement
			 && latestContextMenuTriggeredAnchorElement.href === linkUrl
			) {
				const linkText = latestContextMenuTriggeredAnchorElement.innerText.trim();
				if (linkText) {
					chrome.runtime.sendMessage({
						method: "linkTexts",
						linkUrl,
						texts: [linkText]
					});
					return;
				}
			}
			const linkTexts = searchLinkTexts(linkUrl);
			const uniqueLinkTexts = uniq(linkTexts);
			chrome.runtime.sendMessage({
				method: "linkTexts",
				linkUrl,
				texts: uniqueLinkTexts
			});
		}
	});
})();
