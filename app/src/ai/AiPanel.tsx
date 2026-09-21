import { useEffect, useRef, useState } from "react";
import { Bot, Check, Copy, FilePlus, Play, RefreshCw, Send, Settings, Sparkles, Trash2, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PanelHeader, type HeadAction } from "../panel/PanelHeader";
import { useSessions } from "../store/sessions";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type AiConfig = {
  endpoint: string;
  apiKey: string;
  model: string;
};

const DEFAULT_CONFIG: AiConfig = {
  endpoint: "http://localhost:11434/v1",
  apiKey: "",
  model: "llama3",
};

const QUICK_ACTIONS = [
  { label: "🚀 Kiểm tra Git status", prompt: "Hãy cho tôi lệnh kiểm tra git status và giải thích ngắn gọn" },
  { label: "⚡ Chạy Dev Server", prompt: "Cho tôi lệnh khởi động dev server của dự án này" },
  { label: "📝 Tạo file cấu hình", prompt: "Tạo cho tôi một file cấu hình .env mẫu cho dự án Node/Rust" },
  { label: "🔍 Tối ưu hóa code", prompt: "Hướng dẫn các bước tối ưu hóa hiệu năng cho ứng dụng React/Tauri" },
];

export function AiPanel({ panelKey }: { panelKey: string }) {
  const [config, setConfig] = useState<AiConfig>(() => {
    try {
      const saved = localStorage.getItem("binbox:ai-config");
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [showConfig, setShowConfig] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Xin chào! Tôi là **BinBox AI Assistant** — Trợ lý không gian làm việc của bạn.\n\nTôi có thể giúp bạn:\n- 💻 **Sinh câu lệnh** và chạy thẳng vào Terminal BinBox với 1 click.\n- 📝 **Tạo mã nguồn** và lưu/mở trực tiếp vào Code Editor của BinBox.\n- 🔍 **Giải đáp** kiến trúc mã nguồn và sửa lỗi.\n\nBạn muốn làm gì hôm nay?",
      timestamp: Date.now(),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ranCmdId, setRanCmdId] = useState<string | null>(null);
  const [savedFileId, setSavedFileId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("binbox:ai-config", JSON.stringify(config));
    } catch {}
  }, [config]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (userPrompt?: string) => {
    const textToSend = userPrompt || input.trim();
    if (!textToSend || loading) return;

    if (!userPrompt) setInput("");

    const userMsg: Message = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      content: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Thử gọi OpenAI-compatible endpoint (Ollama local hoặc API cloud)
      if (config.endpoint && (config.apiKey || config.endpoint.includes("localhost") || config.endpoint.includes("127.0.0.1"))) {
        const res = await fetch(`${config.endpoint.replace(/\/+$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              {
                role: "system",
                content:
                  "Bạn là BinBox AI Assistant, trợ lý thông minh tích hợp sẵn trong BinBox Tiling Workspace trên Windows. Khi cung cấp câu lệnh terminal hoặc mã nguồn, hãy bao bọc trong code block (```bash hoặc ```rust/ts...). Trả lời ngắn gọn, chuẩn xác và thân thiện bằng tiếng Việt.",
              },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content: textToSend },
            ],
            temperature: 0.7,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const assistantReply =
            data.choices?.[0]?.message?.content || "Không nhận được phản hồi từ mô hình AI.";
          setMessages((prev) => [
            ...prev,
            {
              id: `msg_${Date.now()}_a`,
              role: "assistant",
              content: assistantReply,
              timestamp: Date.now(),
            },
          ]);
          setLoading(false);
          return;
        }
      }

      // Chế độ Smart Assistant mẫu (offline mode / khi chưa cấu hình API key hoặc chưa bật Ollama)
      await new Promise((r) => setTimeout(r, 600));
      let demoResponse = "";

      const lower = textToSend.toLowerCase();
      if (lower.includes("git") || lower.includes("status")) {
        demoResponse =
          "Dưới đây là câu lệnh kiểm tra trạng thái Git hiện tại:\n\n```bash\ngit status\n```\n\nBạn có thể bấm nút **Chạy trong Terminal** bên dưới khối lệnh để thực thi ngay!";
      } else if (lower.includes("dev") || lower.includes("chạy") || lower.includes("server")) {
        demoResponse =
          "Để khởi động ứng dụng trong môi trường phát triển (Dev Server), hãy chạy lệnh:\n\n```bash\nnpm run dev\n```\n\nLệnh này sẽ khởi động Vite dev server trên cổng 1420.";
      } else if (lower.includes("env") || lower.includes("tạo file") || lower.includes("cấu hình")) {
        demoResponse =
          "Dưới đây là nội dung file cấu hình mẫu `.env`:\n\n```text\n# BinBox Environment Configuration\nPORT=3000\nNODE_ENV=development\nBINBOX_WORKSPACE_MODE=spiral\nAPI_SECRET_KEY=your_secret_key_here\n```\n\nBạn có thể bấm nút **Lưu vào File** bên dưới để ghi thẳng file này vào dự án!";
        demoResponse =
          `Tôi đã nhận yêu cầu của bạn: "${textToSend}".\n\n💡 **Gợi ý:** Để kích hoạt mô hình AI thật sự (LLM), bạn có thể bấm vào nút **Cài đặt AI** (biểu tượng bánh răng ở góc trên) để nhập API Key hoặc kết nối với Ollama local (\`http://localhost:11434/v1\`).\n\nDưới đây là câu lệnh hữu ích bạn có thể thử ngay:\n\n\`\`\`bash\nGet-ChildItem -Directory\n\`\`\``;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_a`,
          role: "assistant",
          content: demoResponse,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_a`,
          role: "assistant",
          content: `⚠️ Không thể kết nối tới AI Endpoint: ${err.message || err}.\n\nBạn có thể mở cài đặt AI để kiểm tra địa chỉ API Endpoint và API Key, hoặc sử dụng Ollama local.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const runCommandInTerminal = (cmd: string, btnId: string) => {
    window.dispatchEvent(
      new CustomEvent("binbox:run-command", {
        detail: { cmd: cmd.trim() },
      }),
    );
    setRanCmdId(btnId);
    setTimeout(() => setRanCmdId(null), 2000);
  };

  const saveSnippetToFile = async (code: string, btnId: string) => {
    try {
      const fileName = prompt("Nhập tên tệp cần lưu:", "snippet.txt");
      if (!fileName) return;

      const cwd = await invoke<string>("fs_cwd").catch(() => ".");
      const filePath = `${cwd.replace(/[/\\]+$/, "")}/${fileName}`;

      await invoke("fs_write_text", { path: filePath, content: code });
      useSessions.getState().openPreview(filePath, "row");
      setSavedFileId(btnId);
      setTimeout(() => setSavedFileId(null), 2500);
    } catch (e: any) {
      alert("Lỗi khi lưu file: " + (e.message || e));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMessageContent = (content: string, msgId: string) => {
    // Tách các code blocks ```lang ... ```
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        const lang = lines[0]?.trim() || "";
        const code = (lang ? lines.slice(1) : lines).join("\n");
        const blockId = `${msgId}_b${index}`;

        return (
          <div key={index} className="ai-code-block">
            <div className="ai-code-header">
              <span className="ai-code-lang">{lang || "code"}</span>
              <div className="ai-code-actions">
                <button
                  className="ai-action-btn"
                  title="Copy code"
                  onClick={() => copyToClipboard(code, blockId)}
                >
                  {copiedId === blockId ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedId === blockId ? "Copied" : "Copy"}</span>
                </button>
                <button
                  className="ai-action-btn"
                  title="Chạy lệnh trong Terminal"
                  onClick={() => runCommandInTerminal(code, blockId)}
                >
                  {ranCmdId === blockId ? <Check size={12} /> : <Play size={12} />}
                  <span>{ranCmdId === blockId ? "Sent" : "Run in Terminal"}</span>
                </button>
                <button
                  className="ai-action-btn"
                  title="Lưu thành file và mở trong Workspace"
                  onClick={() => saveSnippetToFile(code, blockId)}
                >
                  {savedFileId === blockId ? <Check size={12} /> : <FilePlus size={12} />}
                  <span>{savedFileId === blockId ? "Saved" : "Save to File"}</span>
                </button>
              </div>
            </div>
            <pre className="ai-code-pre">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <div key={index} className="ai-text-part">
          {part.split("\n").map((line, lIdx) => (
            <p key={lIdx} style={{ margin: "4px 0" }}>
              {line}
            </p>
          ))}
        </div>
      );
    });
  };

  const headerActions: HeadAction[] = [
    {
      id: "config",
      label: "AI Settings",
      inline: true,
      icon: <Settings size={13} />,
      onClick: () => setShowConfig((s) => !s),
    },
    {
      id: "clear",
      label: "Clear chat",
      icon: <Trash2 size={13} />,
      onClick: () =>
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: "Đã làm mới cuộc trò chuyện. Tôi có thể giúp gì cho bạn?",
            timestamp: Date.now(),
          },
        ]),
    },
  ];

  return (
    <div className="panel ai-panel">
      <PanelHeader
        panelKey={panelKey}
        kind="preview"
        icon={<Sparkles size={14} />}
        title="BinBox AI Agent"
        subtitle="Intelligent Workspace Assistant"
        chips={
          <>
            <span className="chip ok">
              {config.apiKey ? config.model : "Local / Offline Mode"}
            </span>
          </>
        }
        actions={headerActions}
      />

      {showConfig && (
        <div className="ai-config-drawer">
          <div className="ai-config-header">
            <h4>Cấu hình AI Model & Provider</h4>
            <button className="ai-close-btn" onClick={() => setShowConfig(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="ai-config-field">
            <label>API Endpoint (OpenAI-compatible / Ollama):</label>
            <input
              type="text"
              value={config.endpoint}
              placeholder="http://localhost:11434/v1"
              onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
            />
          </div>
          <div className="ai-config-field">
            <label>API Key (để trống nếu dùng Ollama local):</label>
            <input
              type="password"
              value={config.apiKey}
              placeholder="sk-..."
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            />
          </div>
          <div className="ai-config-field">
            <label>Tên Model:</label>
            <input
              type="text"
              value={config.model}
              placeholder="llama3, gpt-4o-mini, deepseek-coder..."
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="ai-chat-body">
        <div className="ai-messages-list">
          {messages.map((m) => (
            <div key={m.id} className={`ai-message ${m.role}`}>
              <div className="ai-avatar">
                {m.role === "assistant" ? <Bot size={15} /> : "You"}
              </div>
              <div className="ai-bubble">{renderMessageContent(m.content, m.id)}</div>
            </div>
          ))}
          {loading && (
            <div className="ai-message assistant">
              <div className="ai-avatar">
                <Bot size={15} />
              </div>
              <div className="ai-bubble ai-typing">
                <RefreshCw size={13} className="spin" /> Đang suy nghĩ và xử lý...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 2 && (
          <div className="ai-quick-actions">
            {QUICK_ACTIONS.map((qa, i) => (
              <button
                key={i}
                className="ai-quick-chip"
                onClick={() => handleSend(qa.prompt)}
              >
                {qa.label}
              </button>
            ))}
          </div>
        )}

        <div className="ai-input-bar">
          <textarea
            ref={textareaRef}
            className="ai-textarea"
            placeholder="Nhập yêu cầu cho AI (ví dụ: 'Hãy tạo câu lệnh build dự án')..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className="ai-send-btn"
            disabled={!input.trim() || loading}
            onClick={() => handleSend()}
            title="Gửi (Enter)"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
