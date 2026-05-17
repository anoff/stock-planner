import { useCallback, useState } from "react";
import { decodeFile, parseTrades, deduplicateTrades } from "../utils/csv";
import type { Trade } from "../utils/types";
import { useLanguage } from "../i18n";

interface StagedFile {
  fileName: string;
  trades: Trade[];
  error?: string;
}

interface DropZoneProps {
  onAnalyze: (trades: Trade[]) => void;
}

async function parseFileBuffer(data: ArrayBuffer, fileName: string): Promise<StagedFile> {
  try {
    const text = decodeFile(data);
    const trades = parseTrades(text);
    return { fileName, trades };
  } catch (err) {
    return {
      fileName,
      trades: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default function DropZone({ onAnalyze }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const { t } = useLanguage();

  const addFiles = useCallback(async (fileList: FileList) => {
    const incoming = await Promise.all(
      Array.from(fileList).map((f) => f.arrayBuffer().then((buf) => parseFileBuffer(buf, f.name)))
    );
    setStagedFiles((prev) => {
      // Skip files whose name is already staged
      const existingNames = new Set(prev.map((f) => f.fileName));
      const novel = incoming.filter((f) => !existingNames.has(f.fileName));
      return [...prev, ...novel];
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        // Reset input so the same file can be re-added after removal
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const removeFile = useCallback((fileName: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.fileName !== fileName));
  }, []);

  const handleAnalyze = useCallback(() => {
    const merged = stagedFiles.flatMap((f) => f.trades);
    const deduped = deduplicateTrades(merged);
    if (deduped.length < merged.length) {
      console.log(
        `Deduplication: ${merged.length} total trades → ${deduped.length} after removing ${merged.length - deduped.length} duplicate(s)`
      );
    }
    onAnalyze(deduped);
  }, [stagedFiles, onAnalyze]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const allTrades = deduplicateTrades(stagedFiles.flatMap((f) => f.trades));
  const totalTrades = allTrades.length;
  const totalPositions = new Set(allTrades.filter((t) => t.side === "buy").map((t) => t.tickerCode)).size;
  const hasFiles = stagedFiles.length > 0;
  const hasErrors = stagedFiles.some((f) => f.error);

  return (
    <div style={{ maxWidth: 600, margin: "32px auto" }}>
      {/* Drop target */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          padding: hasFiles ? "20px 24px" : "48px 24px",
          textAlign: "center",
          backgroundColor: dragOver ? "var(--accent-surface)" : "var(--bg-card)",
          border: `1px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
          borderRadius: hasFiles ? "14px 14px 0 0" : 14,
          borderBottom: hasFiles ? "none" : undefined,
          transition: "background-color 0.2s, padding 0.2s",
          cursor: "pointer",
        }}
      >
        {!hasFiles && (
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.65 }}>📂</div>
        )}
        <p style={{ fontSize: hasFiles ? 13 : 16, fontWeight: 600, color: "var(--text)", margin: "0 0 4px" }}>
          {hasFiles ? t.dropMoreFiles : t.dropHere}
        </p>
        {!hasFiles && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 18px" }}>
            {t.dropHint}
          </p>
        )}
        <label
          style={{
            display: "inline-block",
            marginTop: hasFiles ? 8 : 0,
            padding: "6px 18px",
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
          {t.browseFiles}
          <input
            type="file"
            accept=".csv"
            multiple
            onChange={handleChange}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {/* File list + summary + analyze button */}
      {hasFiles && (
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderTop: "1px solid var(--border)",
            borderRadius: "0 0 14px 14px",
          }}
        >
          {/* File rows */}
          <ul style={{ listStyle: "none", margin: 0, padding: "4px 0" }}>
            {stagedFiles.map((f) => (
              <li
                key={f.fileName}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 16px",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                {/* File icon */}
                <span style={{ opacity: 0.5, flexShrink: 0 }}>📄</span>

                {/* Name */}
                <span
                  style={{
                    flex: 1,
                    color: f.error ? "var(--negative)" : "var(--text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={f.error ?? f.fileName}
                >
                  {f.fileName}
                </span>

                {/* Trade count or error badge */}
                {f.error ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--negative)",
                      background: "color-mix(in srgb, var(--negative) 12%, transparent)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                    title={f.error}
                  >
                    {t.errorBadge}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    {t.tradesBadge(f.trades.length)}
                  </span>
                )}

                {/* Remove */}
                <button
                  onClick={() => removeFile(f.fileName)}
                  title={t.removeFile}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: 16,
                    lineHeight: 1,
                    padding: "0 2px",
                    flexShrink: 0,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--negative)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          {/* Summary + Analyze row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {hasErrors ? (
                <span style={{ color: "var(--negative)" }}>{t.fixErrorsBeforeAnalyzing}</span>
              ) : (
                <>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{totalTrades}</span>
                  {t.dropTradesSuffix}
                  {t.dropTradeSeparator}
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{totalPositions}</span>
                  {t.dropPositionSuffix(totalPositions)}
                </>
              )}
            </span>

            <button
              className="btn-primary"
              onClick={handleAnalyze}
              disabled={hasErrors || totalTrades === 0}
            >
              {t.analyzeBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
