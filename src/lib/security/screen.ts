type ScreenGuardOptions = {
  onViolation: (code: string, context?: Record<string, unknown>) => void;
  onFocusChange?: (hasFocus: boolean) => void;
};

const SCREEN_SHARE_KEYWORDS = ["meet", "teams", "zoom", "quicktime", "obs", "bandicam"];

function detectScreenShareProcesses() {
  const title = document.title.toLowerCase();
  return SCREEN_SHARE_KEYWORDS.some((keyword) => title.includes(keyword));
}

export function initScreenGuards({ onViolation, onFocusChange }: ScreenGuardOptions) {
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
    if (event.key === "PrintScreen" || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "s")) {
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

  const detectScreenShare = () => {
    if (detectScreenShareProcesses()) {
      onViolation("SCREEN_SHARING");
    }
  };

  const detectDevTools = () => {
    const widthGap = window.outerWidth - window.innerWidth;
    const heightGap = window.outerHeight - window.innerHeight;
    const devToolsOpen = widthGap > 200 || heightGap > 200;
    if (devToolsOpen && !devToolsLastState) {
      onViolation("DEVTOOLS_OPENED");
      devToolsLastState = true;
      window.location.reload();
    } else if (!devToolsOpen) {
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

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("blur", handleBlur);
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("keydown", handleKeydown);
  };
}
