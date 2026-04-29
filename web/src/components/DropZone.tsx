import { useCallback, useRef, useState } from "react";

interface DropZoneProps {
  onFileLoaded: (data: ArrayBuffer, fileName: string) => void;
  onPasteLoaded: (text: string) => void;
}

type Tab = "paste" | "csv";

export default function DropZone({ onFileLoaded, onPasteLoaded }: DropZoneProps) {
  const [activeTab, setActiveTab] = useState<Tab>("paste");
  const [pasteText, setPasteText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── CSV upload handlers ────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) file.arrayBuffer().then((buf) => onFileLoaded(buf, file.name));
    },
    [onFileLoaded]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) file.arrayBuffer().then((buf) => onFileLoaded(buf, file.name));
    },
    [onFileLoaded]
  );

  // ── Paste submit ───────────────────────────────────────────────
  const handleAnalyze = useCallback(() => {
    const text = pasteText.trim();
    if (text) onPasteLoaded(text);
  }, [pasteText, onPasteLoaded]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd+Enter to submit
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleAnalyze();
      }
    },
    [handleAnalyze]
  );

  // ── Shared container style ─────────────────────────────────────
  const containerStyle: React.CSSProperties = {
    maxWidth: 600,
    margin: "32px auto",
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    overflow: "hidden",
  };

  // ── Tab bar styles ─────────────────────────────────────────────
  const tabBarStyle: React.CSSProperties = {
    display: "flex",
    borderBottom: "1px solid var(--border)",
  };

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    flex: 1,
    padding: "11px 0",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    border: "none",
    borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
    backgroundColor: "transparent",
    color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
    transition: "color 0.15s, border-color 0.15s",
    marginBottom: -1,
  });

  return (
    <div style={containerStyle}>
      {/* Tab bar */}
      <div style={tabBarStyle}>
        <button style={tabStyle("paste")} onClick={() => setActiveTab("paste")}>
          📋 Paste from Web
        </button>
        <button style={tabStyle("csv")} onClick={() => setActiveTab("csv")}>
          📂 Upload CSV
        </button>
      </div>

      {/* ── Paste tab ─────────────────────────────────────────────── */}
      {activeTab === "paste" && (
        <div style={{ padding: "20px 24px 24px" }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 4px" }}>
            Open the{" "}
            <strong style={{ color: "var(--text-secondary)" }}>
              Rakuten Securities trade history page
            </strong>
            , select all (Ctrl+A / ⌘A), copy, and paste below.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
            Works with both Japanese and auto-translated English. Supports multiple pages pasted together.
          </p>
          <textarea
            ref={textareaRef}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"2025/03/14\n2025/03/18\nSeven & i HLDGS\n3382 TSE\n..."}
            spellCheck={false}
            style={{
              width: "100%",
              height: 180,
              resize: "vertical",
              fontFamily: "monospace",
              fontSize: 12,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-surface)",
              color: "var(--text)",
              outline: "none",
              boxSizing: "border-box",
              lineHeight: 1.5,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-light)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, gap: 8 }}>
            {pasteText && (
              <button
                className="btn btn-sm"
                onClick={() => setPasteText("")}
              >
                Clear
              </button>
            )}
            <button
              className="btn btn-primary"
              disabled={!pasteText.trim()}
              onClick={handleAnalyze}
              style={{ opacity: pasteText.trim() ? 1 : 0.45, cursor: pasteText.trim() ? "pointer" : "default" }}
            >
              Analyze →
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "10px 0 0", textAlign: "center" }}>
            Tip: Ctrl+Enter / ⌘+Enter to submit
          </p>
        </div>
      )}

      {/* ── CSV upload tab ─────────────────────────────────────────── */}
      {activeTab === "csv" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            padding: "48px 24px",
            textAlign: "center",
            backgroundColor: dragOver ? "var(--accent-surface)" : "transparent",
            borderRadius: "0 0 14px 14px",
            transition: "background-color 0.2s",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.65 }}>📂</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 4px" }}>
            Drop your Rakuten CSV here
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 18px" }}>
            Supports tradehistory (JP) and tradehistory (INVST) CSV files
          </p>
          <label
            style={{
              display: "inline-block",
              padding: "8px 22px",
              backgroundColor: "var(--accent)",
              color: "#fff",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLLabelElement).style.backgroundColor = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLLabelElement).style.backgroundColor = "var(--accent)";
            }}
          >
            Browse files
            <input
              type="file"
              accept=".csv"
              onChange={handleChange}
              style={{ display: "none" }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
