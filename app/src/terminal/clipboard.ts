import { invoke } from "@tauri-apps/api/core";

/**
 * Đọc văn bản từ Clipboard đa tầng:
 * 1. Ưu tiên Win32 API native `app_clipboard_read_text` (100% tin cậy, không bao giờ bị chặn quyền).
 * 2. Fallback sang `navigator.clipboard.readText()`.
 */
export async function readClipboardText(): Promise<string> {
  try {
    const text = await invoke<string>("app_clipboard_read_text");
    if (text && typeof text === "string") return text;
  } catch {
    // Không phải môi trường Tauri hoặc lệnh native không sẵn sàng
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      if (text) return text;
    }
  } catch {
    // Bị trình duyệt chặn quyền hoặc không có user gesture
  }

  return "";
}

/**
 * Ghi văn bản vào Clipboard đa tầng:
 * 1. Ghi trực tiếp qua Win32 API native `app_clipboard_write_text`.
 * 2. Đồng thời gọi `navigator.clipboard.writeText()` để đồng bộ context web.
 */
export async function writeClipboardText(text: string): Promise<void> {
  if (!text) return;
  try {
    await invoke("app_clipboard_write_text", { text });
  } catch {}

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch {}
}
