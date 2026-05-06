import { useCallback, useState } from "react";

interface DropZoneProps {
  onFileLoaded: (data: ArrayBuffer, fileName: string) => void;
}

export default function DropZone({ onFileLoaded }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

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

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        maxWidth: 600,
        margin: "32px auto",
        padding: "48px 24px",
        textAlign: "center",
        backgroundColor: dragOver ? "var(--accent-surface)" : "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        transition: "background-color 0.2s",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.65 }}>📂</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 4px" }}>
        Drop your Rakuten CSV here
      </p>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 18px" }}>
        Supports tradehistory (JP), tradehistory (US), and tradehistory (INVST) CSV files
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
  );
}
