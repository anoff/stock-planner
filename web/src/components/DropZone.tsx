import { useCallback, useRef, useState } from "react";
import { decodeFile, deduplicateTrades } from "../utils/csv";
import { PROVIDERS } from "../utils/providers";
import type { ProviderConfig } from "../utils/providers";
import type { Trade } from "../utils/types";
import { useLanguage } from "../i18n";

interface StagedFile {
  fileName: string;
  trades: Trade[];
  error?: string;
}

interface DropZoneProps {
  onAnalyze: (trades: Trade[], baseCurrency: "EUR" | "JPY") => void;
}

async function parseFileBuffer(
  data: ArrayBuffer,
  fileName: string,
  provider: ProviderConfig
): Promise<StagedFile> {
  try {
    const text = decodeFile(data);
    if (!provider.validate(text)) {
      return {
        fileName,
        trades: [],
        error: `File does not look like a ${provider.name} export — check the selected provider.`,
      };
    }
    const trades = provider.parse(text);
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
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // ── Provider selection ──────────────────────────────────────────────────────

  const handleSelectProvider = useCallback((provider: ProviderConfig) => {
    setSelectedProvider(provider);
    setStagedFiles([]); // clear files when provider changes
  }, []);

  const handleChangeProvider = useCallback(() => {
    setSelectedProvider(null);
    setStagedFiles([]);
  }, []);

  // ── File handling ───────────────────────────────────────────────────────────

  const addFiles = useCallback(async (fileList: FileList) => {
    if (!selectedProvider) return;
    const provider = selectedProvider;
    const incoming = await Promise.all(
      Array.from(fileList).map((f) =>
        f.arrayBuffer().then((buf) => parseFileBuffer(buf, f.name, provider))
      )
    );
    setStagedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.fileName));
      const novel = incoming.filter((f) => !existingNames.has(f.fileName));
      return [...prev, ...novel];
    });
  }, [selectedProvider]);

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
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const removeFile = useCallback((fileName: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.fileName !== fileName));
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!selectedProvider) return;
    const merged = stagedFiles.flatMap((f) => f.trades);
    const deduped = deduplicateTrades(merged);
    if (deduped.length < merged.length) {
      console.log(
        `Deduplication: ${merged.length} total trades → ${deduped.length} after removing ${merged.length - deduped.length} duplicate(s)`
      );
    }
    onAnalyze(deduped, selectedProvider.currency);
  }, [stagedFiles, selectedProvider, onAnalyze]);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const allTrades = deduplicateTrades(stagedFiles.flatMap((f) => f.trades));
  const totalTrades = allTrades.length;
  const totalPositions = new Set(
    allTrades.filter((t) => t.side === "buy").map((t) => t.tickerCode)
  ).size;
  const hasFiles = stagedFiles.length > 0;
  const hasErrors = stagedFiles.some((f) => f.error);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, margin: "32px auto" }}>

      {/* ── Provider selector ── */}
      {!selectedProvider ? (
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 12,
          }}>
            {t.selectProvider}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectProvider(p)}
                style={{
                  flex: "1 1 220px",
                  padding: "16px 20px",
                  textAlign: "left",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--accent-surface)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--bg-card)";
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                  {p.description}
                </div>
                <div style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--accent)",
                  background: "var(--accent-surface)",
                  border: "1px solid var(--accent)",
                  borderRadius: 4,
                  padding: "2px 8px",
                }}>
                  {p.currency}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ── Selected provider banner ── */
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          marginBottom: 12,
          backgroundColor: "var(--accent-surface)",
          border: "1px solid var(--accent)",
          borderRadius: 8,
          fontSize: 13,
        }}>
          <span>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{selectedProvider.name}</span>
            <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>· {selectedProvider.currency}</span>
          </span>
          <button
            onClick={handleChangeProvider}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              color: "var(--accent)",
              padding: "0 2px",
            }}
          >
            {t.changeProvider}
          </button>
        </div>
      )}

      {/* ── Drop target (disabled until provider selected) ── */}
      <div
        onDragOver={(e) => { if (selectedProvider) { e.preventDefault(); setDragOver(true); } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => { if (selectedProvider) fileInputRef.current?.click(); }}
        style={{
          padding: hasFiles ? "20px 24px" : "48px 24px",
          textAlign: "center",
          backgroundColor: dragOver ? "var(--accent-surface)" : "var(--bg-card)",
          border: `1px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
          borderRadius: hasFiles ? "14px 14px 0 0" : 14,
          borderBottom: hasFiles ? "none" : undefined,
          transition: "background-color 0.2s, padding 0.2s",
          cursor: selectedProvider ? "pointer" : "not-allowed",
          opacity: selectedProvider ? 1 : 0.45,
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
        {/* Browse button — stopPropagation prevents the click reaching the div above */}
        <button
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          disabled={!selectedProvider}
          style={{
            display: "inline-block",
            marginTop: hasFiles ? 8 : 0,
            padding: "6px 18px",
            backgroundColor: selectedProvider ? "var(--accent)" : "var(--text-muted)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: selectedProvider ? "pointer" : "not-allowed",
            fontSize: 13,
            fontWeight: 600,
            transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => {
            if (selectedProvider)
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            if (selectedProvider)
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--accent)";
          }}
        >
          {t.browseFiles}
        </button>
      </div>

      {/* Hidden file input — shared by the drop zone click and the browse button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        multiple
        onChange={handleChange}
        disabled={!selectedProvider}
        style={{ display: "none" }}
      />

      {/* ── File list + summary + analyze button ── */}
      {hasFiles && (
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderTop: "1px solid var(--border)",
            borderRadius: "0 0 14px 14px",
          }}
        >
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
                <span style={{ opacity: 0.5, flexShrink: 0 }}>📄</span>
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
