let typingTimer: number | null = null;

/**
 * Thông báo khi người dùng gõ phím trong terminal để kích hoạt Typing Ghost Mode cho Dock.
 * Dock sẽ mờ xuống opacity 0.12 và pointer-events: none, sau 1.2s không gõ sẽ tự động hồi phục 1.0.
 */
export function notifyTerminalTyping() {
  if (typeof document === "undefined") return;

  if (typingTimer !== null) {
    window.clearTimeout(typingTimer);
  } else {
    document.body.classList.add("terminal-typing");
  }

  typingTimer = window.setTimeout(() => {
    document.body.classList.remove("terminal-typing");
    typingTimer = null;
  }, 1200);
}
