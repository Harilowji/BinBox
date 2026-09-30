import { useEffect, useState } from "react";
import { Folder, Globe, Sparkles, Terminal, ChevronRight, HardDrive } from "lucide-react";

type Props = {
  onTerminal: () => void;
  onFiles: () => void;
  onAi: () => void;
  onWeb: () => void;
  onOpenRecent: (path: string) => void;
};

const DEFAULT_RECENT_PROJECTS = [
  "D:\\Project\\01_My_GitHub_Repos\\BinBox",
  "D:\\Project\\01_My_GitHub_Repos\\spotify-wallpaper-engine-sync",
  "C:\\Users\\Shadow",
];

function getRecentProjects(): string[] {
  try {
    const saved = localStorage.getItem("binbox:recent-projects");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 4);
    }
  } catch {}
  return DEFAULT_RECENT_PROJECTS;
}

export function HeroGlassDashboard({
  onTerminal,
  onFiles,
  onAi,
  onWeb,
  onOpenRecent,
}: Props) {
  const [now, setNow] = useState<Date>(new Date());
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  useEffect(() => {
    setRecentProjects(getRecentProjects());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const dateStr = now.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const cards = [
    {
      id: "terminal",
      title: "New Terminal",
      subtitle: "Launch high-performance PTY shell",
      icon: <Terminal size={22} className="hero-card-icon" />,
      accent: "var(--ui-primary)",
      onClick: onTerminal,
      tag: ">_",
    },
    {
      id: "explorer",
      title: "File Explorer",
      subtitle: "Browse workspace trees and source files",
      icon: <Folder size={22} className="hero-card-icon" />,
      accent: "var(--ui-tertiary)",
      onClick: onFiles,
      tag: "explorer",
    },
    {
      id: "ai",
      title: "AI Assistant",
      subtitle: "Pair-program with autonomous agents",
      icon: <Sparkles size={22} className="hero-card-icon" />,
      accent: "var(--ui-secondary)",
      onClick: onAi,
      tag: "agentic",
    },
    {
      id: "web",
      title: "Web Browser",
      subtitle: "Isolated preview & documentation surface",
      icon: <Globe size={22} className="hero-card-icon" />,
      accent: "var(--ui-outline)",
      onClick: onWeb,
      tag: "webview",
    },
  ];

  return (
    <div className="empty-workspace hero-dashboard-wrap" data-tauri-drag-region>
      <div className="hero-glass-card chamfer-all" data-tauri-drag-region>
        {/* Minimalist Clock & Date Header */}
        <header className="hero-header" data-tauri-drag-region>
          <div className="hero-brand-badge chamfer-tr">
            <span className="brand-dot live" />
            <span>BINBOX STUDIO</span>
            <span className="hero-badge-ver">v0.2.3</span>
          </div>

          <div className="hero-clock" aria-label={`Current time: ${timeStr}`}>
            <span className="hero-time">{timeStr}</span>
            <span className="hero-seconds">
              {String(now.getSeconds()).padStart(2, "0")}
            </span>
          </div>

          <div className="hero-date">{dateStr}</div>
        </header>

        {/* 4 Quick Action Cards */}
        <div className="hero-actions-grid">
          {cards.map((card) => (
            <button
              key={card.id}
              className="hero-action-card chamfer-tr"
              onClick={card.onClick}
              type="button"
            >
              <div className="hero-card-head">
                <div
                  className="hero-card-icon-wrap"
                  style={{ color: card.accent }}
                >
                  {card.icon}
                </div>
                <span className="hero-card-tag">{card.tag}</span>
              </div>
              <div className="hero-card-body">
                <h4 className="hero-card-title">{card.title}</h4>
                <p className="hero-card-subtitle">{card.subtitle}</p>
              </div>
              <div className="hero-card-footer">
                <span>Open</span>
                <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>

        {/* Recent Projects Row */}
        {recentProjects.length > 0 && (
          <div className="hero-recent-section">
            <div className="hero-recent-label">
              <HardDrive size={13} />
              <span>Recent Projects</span>
            </div>
            <div className="hero-recent-list">
              {recentProjects.map((p) => {
                const parts = p.split(/[/\\]/);
                const name = parts[parts.length - 1] || p;
                return (
                  <button
                    key={p}
                    className="hero-recent-pill chamfer-tr"
                    onClick={() => onOpenRecent(p)}
                    title={p}
                    type="button"
                  >
                    <Folder size={13} className="hero-recent-icon" />
                    <span className="hero-recent-name">{name}</span>
                    <span className="hero-recent-path">{p}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
