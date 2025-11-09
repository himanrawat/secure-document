type ScreenGuardOptions = {
	onViolation: (code: string, context?: Record<string, unknown>) => void;
	onFocusChange?: (hasFocus: boolean) => void;
};

const SCREEN_SHARE_KEYWORDS = [
	"meet",
	"teams",
	"zoom",
	"quicktime",
	"obs",
	"bandicam",
];

function detectScreenShareProcesses() {
	const title = document.title.toLowerCase();
	return SCREEN_SHARE_KEYWORDS.some((keyword) => title.includes(keyword));
}

export function initScreenGuards({
	onViolation,
	onFocusChange,
}: ScreenGuardOptions) {
	let lastFocus = true;
	let devToolsLastState = false;

	const handleVisibility = () => {
		const focused = document.visibilityState === "visible";
		onFocusChange?.(focused);
		if (!focused) {
			onViolation("FOCUS_LOSS", { reason: "visibilitychange" });
		}
	};

	const handleBlur = () => {
		lastFocus = false;
		onFocusChange?.(false);
		onViolation("FOCUS_LOSS", { reason: "window_blur" });
	};

	const handleFocus = () => {
		if (!lastFocus) {
			lastFocus = true;
			onFocusChange?.(true);
		}
	};

	const handleKeydown = (event: KeyboardEvent) => {
		// Block DevTools shortcuts
		if (
			event.key === "F12" ||
			(event.ctrlKey && event.shiftKey && event.key === "I") ||
			(event.ctrlKey && event.shiftKey && event.key === "C") ||
			(event.ctrlKey && event.shiftKey && event.key === "J") ||
			(event.metaKey && event.altKey && event.key === "I") ||
			(event.metaKey && event.altKey && event.key === "C") ||
			(event.metaKey && event.altKey && event.key === "J")
		) {
			event.preventDefault();
			event.stopPropagation();
			onViolation("DEVTOOLS_ATTEMPT", { key: event.key });
			return false;
		}

		if (
			event.key === "PrintScreen" ||
			(event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "s")
		) {
			event.preventDefault();
			onViolation("SCREENSHOT_ATTEMPT", { via: event.key });
		}
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
			event.preventDefault();
			onViolation("POLICY_BREACH", { reason: "print_blocked" });
		}
		if (event.altKey && event.key === "Tab") {
			onViolation("FOCUS_LOSS", { reason: "alt_tab" });
		}
	};

	const handleContextMenu = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		onViolation("POLICY_BREACH", { reason: "right_click_blocked" });
		return false;
	};

	const detectScreenShare = () => {
		if (detectScreenShareProcesses()) {
			onViolation("SCREEN_SHARING");
		}
	};

	const detectDevTools = () => {
		const widthGap = window.outerWidth - window.innerWidth;
		const heightGap = window.outerHeight - window.innerHeight;
		const devToolsOpen = widthGap > 200 || heightGap > 200;

		// Additional detection methods
		const threshold = 160;
		const devToolsOpenAlt =
			window.outerWidth - window.innerWidth > threshold ||
			window.outerHeight - window.innerHeight > threshold;

		// Check for debugger statement timing
		const startTime = performance.now();
		debugger;
		const endTime = performance.now();
		const debuggerOpen = endTime - startTime > 100;

		if (
			(devToolsOpen || devToolsOpenAlt || debuggerOpen) &&
			!devToolsLastState
		) {
			onViolation("DEVTOOLS_OPENED");
			devToolsLastState = true;
			// Kill the session immediately
			document.body.innerHTML =
				'<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:system-ui;text-align:center;padding:2rem;"><div><h1>Security Violation</h1><p>Developer tools detected. Session terminated.</p><p style="opacity:0.6;font-size:0.875rem;margin-top:1rem;">This incident has been logged.</p></div></div>';
			window.location.reload();
		} else if (!devToolsOpen && !devToolsOpenAlt && !debuggerOpen) {
			devToolsLastState = false;
		}
	};

	const intervalId = window.setInterval(() => {
		detectScreenShare();
		detectDevTools();
	}, 2000);

	window.addEventListener("visibilitychange", handleVisibility);
	window.addEventListener("blur", handleBlur);
	window.addEventListener("focus", handleFocus);
	window.addEventListener("keydown", handleKeydown);
	window.addEventListener("contextmenu", handleContextMenu);

	return () => {
		window.clearInterval(intervalId);
		window.removeEventListener("visibilitychange", handleVisibility);
		window.removeEventListener("blur", handleBlur);
		window.removeEventListener("focus", handleFocus);
		window.removeEventListener("keydown", handleKeydown);
		window.removeEventListener("contextmenu", handleContextMenu);
	};
}
