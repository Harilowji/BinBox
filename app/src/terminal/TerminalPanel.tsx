import { useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePty } from "./usePty";
import { useSessions } from "../store/sessions";
import { PanelHeader, type HeadAction } from "../panel/PanelHeader";
import { useThemeStore } from "../theme/useTheme";
import { ContextMenu, useContextMenu, type MenuItem } from "../ui/ContextMenu";
import type { ITheme } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

type Props = {
  panelKey?: string;
  shell?: string;
  cwd?: string;
  theme?: ITheme;
  visible?: boolean;
};

/**
 * Một panel terminal.
 *
 * Tiêu đề không còn ghi cứng "pwsh". Chạy `vim`, `htop`, `npm run dev` thì thanh trên
 * phải nói đúng thứ đang chạy — có nhiều panel mở cùng lúc thì đó là cách duy nhất
 * để phân biệt chúng bằng mắt.
 */
export function TerminalPanel({ panelKey, shell, cwd, theme, visible }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scrollback = useThemeStore((s) => s.opts.terminalScrollback);
  const fontSize = useThemeStore((s) => s.opts.terminalFontSize);
  const cursorStyle = useThemeStore((s) => s.opts.terminalCursorStyle);

  const { state, error, blocks, running, cwd: liveCwd, copyLastOutput, jumpPrev, jumpNext, term } = usePty(
    host,
    { shell, cwd, theme, panelKey, panelVisible: visible, scrollback, fontSize, cursorStyle },
  );

  const { menu, openMenu, closeMenu } = useContextMenu();

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const t = term.current;
      const hasSel = t ? t.hasSelection() : false;

      const items: MenuItem[] = [
        {
          id: "emoji",
          label: "Emoji",
          shortcut: "Win+Period",
          onClick: () => {
            invoke("app_open_emoji_picker").catch(() => {});
          },
        },
        {
          id: "undo",
          label: "Undo",
          shortcut: "Ctrl+Z",
          onClick: () => {
            t?.input("\x1a");
          },
        },
        {
          id: "cut",
          label: "Cut",
          shortcut: "Ctrl+X",
          disabled: !hasSel,
          onClick: () => {
            if (t && t.hasSelection()) {
              navigator.clipboard.writeText(t.getSelection()).catch(() => {});
              t.clearSelection();
            }
          },
        },
        {
          id: "copy",
          label: "Copy",
          shortcut: "Ctrl+C",
          disabled: !hasSel,
          onClick: () => {
            if (t && t.hasSelection()) {
              navigator.clipboard.writeText(t.getSelection()).catch(() => {});
              t.clearSelection();
            }
          },
        },
        {
          id: "paste",
          label: "Paste",
          shortcut: "Ctrl+V",
          onClick: () => {
            navigator.clipboard.readText().then((text) => {
              if (text && t) t.paste(text);
            }).catch(() => {});
          },
        },
        {
          id: "paste-plain",
          label: "Paste as plain text",
          shortcut: "Ctrl+Shift+V",
          onClick: () => {
            navigator.clipboard.readText().then((text) => {
              if (text && t) t.paste(text);
            }).catch(() => {});
          },
        },
        {
          id: "select-all",
          label: "Select all",
          shortcut: "Ctrl+A",
          onClick: () => {
            t?.selectAll();
          },
        },
        {
          id: "clear",
          label: "Clear terminal",
          shortcut: "Ctrl+L",
          sep: true,
          onClick: () => {
            t?.clear();
          },
        },
        {
          id: "reset",
          label: "Reset terminal session",
          onClick: () => {
            t?.reset();
          },
        },
      ];

      openMenu(e, items);
    },
    [term, openMenu],
  );

  // Đẩy thư mục thật lên store để Ctrl+Shift+D nhân đôi panel *ở đúng chỗ shell đang đứng*,
  // chứ không phải chỗ nó được mở ra lúc đầu.
  const updatePanel = useSessions((s) => s.updatePanel);
  useEffect(() => {
    if (panelKey && liveCwd && liveCwd !== cwd) updatePanel(panelKey, { cwd: liveCwd });
  }, [panelKey, liveCwd, cwd, updatePanel]);

  const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
  const title = appTitle(running, shell);

  const actions: HeadAction[] =
    blocks.length > 0
      ? [
          {
            id: "prev",
            label: "Jump to previous command (Ctrl+↑)",
            // Không `inline`: ba thao tác này có phím tắt, để chúng thành ba nút nữa trên
            // thanh là biến thanh tiêu đề thành hàng biểu tượng. Chúng nằm trong menu `⋯`.
            icon: <path d="M12 19V5M5 12l7-7 7 7" />,
            onClick: jumpPrev,
          },
          {
            id: "next",
            label: "Jump to next command (Ctrl+↓)",
            icon: <path d="M12 5v14M19 12l-7 7-7-7" />,
            onClick: jumpNext,
          },
          {
            id: "copy",
            label: "Copy latest command output",
            icon: (
              <>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </>
            ),
            onClick: copyLastOutput,
          },
        ]
      : [];

  return (
    <div className="panel terminal-panel">
      <PanelHeader
        panelKey={panelKey}
        kind="term"
        title={title}
        subtitle={liveCwd ?? cwd}
        actions={actions}
        chips={
          <>
            {running && <span className="chip run">running</span>}
            {!running && lastBlock && (
              <span
                className={
                  "chip " + (lastBlock.status === "error" ? "err" : lastBlock.status === "success" ? "ok" : "run")
                }
              >
                {lastBlock.status === "error" ? `exit ${lastBlock.exitCode}` : "0 · ok"}
              </span>
            )}
            {state === "exited" && <span className="chip err">shell exited</span>}
            {state === "error" && <span className="chip err">{error}</span>}
          </>
        }
      />
      <div className="term" ref={host} onContextMenu={handleContextMenu} />
      <ContextMenu menu={menu} onClose={closeMenu} />
    </div>
  );
}

/**
 * Tên hiển thị của panel: lệnh đang chạy, hoặc tên shell khi rảnh.
 *
 * Nguồn duy nhất là OSC 133;C do chính prompt hook của ta phát ra — xem `pty/session.rs`.
 * OSC 0/2 (tiêu đề cửa sổ) trông có vẻ hợp lý hơn nhưng không dùng được: ConPTY khởi động
 * với tiêu đề console thừa kế từ tiến trình cha, nên panel mới mở đã mang tên linh tinh.
 */
function appTitle(running: string | null, shell?: string): string {
  if (running) {
    // Có payload thì `commandText` là dòng lệnh sạch; không có thì nó đọc từ buffer nên
    // còn dính prompt phía trước: "PS D:\x> npm run dev".
    const afterPrompt = running.includes("> ") ? running.slice(running.lastIndexOf("> ") + 2) : running;
    const first = afterPrompt.trim().split(/\s+/)[0];
    if (first) return baseName(first);
  }
  return baseName(shell ?? "pwsh");
}

function baseName(p: string): string {
  const n = p.split(/[/\\]/).pop() ?? p;
  return n.replace(/\.exe$/i, "");
}
