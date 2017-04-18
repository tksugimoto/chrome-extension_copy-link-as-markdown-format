
const ID_COPY_LINK = "copy_link";

const createContextMenu = () => {
	chrome.contextMenus.create({
		title: "リンクをマークダウン書式でコピー",
		contexts: ["link"],
		documentUrlPatterns: [
			"http://*/*",
			"https://*/*",
			"file:///*"
		],
		id: ID_COPY_LINK
	});
};

chrome.runtime.onInstalled.addListener(createContextMenu);
chrome.runtime.onStartup.addListener(createContextMenu);

chrome.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === ID_COPY_LINK) {
		const linkUrl = info.linkUrl;
		const frameId = info.frameId;
		const activeTabId = tab.id;

		// permissionsにURL or activeTabが必要
		chrome.tabs.executeScript(activeTabId, {
			frameId,
			file: "search_link_texts.js"
		}, () => {
			chrome.tabs.sendMessage(activeTabId, {
				method: "searchLinkTexts",
				linkUrl
			}, {frameId});
		});
	}
});

chrome.runtime.onMessage.addListener((request, sender) => {
	const preprocessing = request.closeMessageSender ? new Promise(resolve => {
		chrome.tabs.remove(sender.tab.id, resolve);
	}) : Promise.resolve();

	preprocessing.then(() => {
		if (request.method === "linkTexts") {
			const linkTexts = request.texts;
			const linkUrl = request.linkUrl;
			if (linkTexts.length === 1) {
				const linkText = linkTexts[0];
				const markdownFormat = generateMarkdownLinkFormat(linkText, linkUrl);

				copy(markdownFormat);

				notifyCopyCompletion(markdownFormat);
			} else if (linkTexts.length >= 2) {
				localStorage.textSelectorData = JSON.stringify({
					linkTexts,
					returnMessageBase: {
						method: "linkTexts",
						linkUrl
					}
				});
				chrome.windows.create({
					url: "text_selector.html",
					type: "popup",
					state: "fullscreen"
				});
			}
		}
	});
});

const generateMarkdownLinkFormat = (linkText, linkUrl) => {
	const text = linkText.replace(/\[|\]|\\/g, "\\$&");
	const url = linkUrl.replace(/\)/g, "\\)");
	let decodedUrl = linkUrl;
	try {
		decodedUrl = decodeURIComponent(linkUrl);
	} catch (e) {}
	const tooltip = decodedUrl.replace(/"\)/g, '"\\)');
	return `[${text}](${url} "${tooltip}")`;
};

const textarea = document.createElement("textarea");
document.body.appendChild(textarea);

const copy = text => {
	textarea.value = text;
	textarea.select();
	document.execCommand("copy");
};

const notifyCopyCompletion = message => {
	chrome.notifications.create({
		title: "リンクをマークダウン書式でコピー完了",
		message,
		type: "basic",
		iconUrl: "icon/icon.png"
	});
};

chrome.notifications.onClicked.addListener(notificationId => {
	chrome.notifications.clear(notificationId);
});
