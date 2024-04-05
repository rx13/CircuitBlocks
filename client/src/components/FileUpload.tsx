// FileUpload.tsx
import React, { useRef } from "react";

interface FileUploadProps {
  accept: string[];
  maxSize: number;
  onUpload: (file: File) => Promise<void>;
  onError: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  maxSize,
  onUpload,
  onError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!accept.includes(file.type)) {
      onError("Unsupported file type.");
      return;
    }
    if (file.size > maxSize) {
      onError("File size exceeds limit.");
      return;
    }
    try {
      await onUpload(file);
    } catch (e: any) {
      onError(e.message || "Upload failed.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      style={{
        border: "2px dashed #aaa",
        borderRadius: 8,
        padding: 24,
        textAlign: "center",
        cursor: "pointer",
        background: "#fafafa",
      }}
      title="Click or drag a file here"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        style={{ display: "none" }}
        onChange={handleChange}
      />
      <div>Click or drag a file here to upload</div>
      <div style={{ fontSize: 12, color: "#888" }}>
        Accepted: {accept.join(", ")} | Max size: {Math.round(maxSize / 1024)} KB
      </div>
    </div>
  );
};
