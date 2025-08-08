// CustomSpriteUpload.tsx
import React, { useState } from "react";
import { FileUpload } from "../../../../components/FileUpload";
import { processImageFile, validateImageFile } from "../../../../helpers/imageProcessing";
import { BrowserStorageManager } from "../../../../helpers/storage/BrowserStorageManager";
import { v4 as uuidv4 } from "uuid";
import type { CustomSpriteData } from "../../../../helpers/storage/StorageManager";
import { Box, Typography, Button, CircularProgress, Alert } from "@mui/material";

interface CustomSpriteUploadProps {
  onSpriteAdded: (sprite: CustomSpriteData) => void;
}

export const CustomSpriteUpload: React.FC<CustomSpriteUploadProps> = ({ onSpriteAdded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || "Invalid file.");
        setLoading(false);
        return;
      }
      const processed = await processImageFile(file);
      const id = uuidv4();
      const now = new Date().toISOString();
      // Create a 32x32 thumbnail
      const img = new window.Image();
      img.src = processed.data;
      await new Promise((resolve) => (img.onload = resolve));
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = 32;
      thumbCanvas.height = 32;
      const ctx = thumbCanvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, 32, 32);
      const thumbnail = thumbCanvas.toDataURL("image/png");

      const sprite: CustomSpriteData = {
        id,
        name: file.name.replace(/\.[^/.]+$/, ""),
        imageData: processed.data,
        width: processed.width,
        height: processed.height,
        created: now,
        thumbnail,
      };
      const storage = new BrowserStorageManager();
      await storage.saveCustomSprite(sprite);
      onSpriteAdded(sprite);
    } catch (e: any) {
      setError(e.message || "Failed to process image.");
    }
    setLoading(false);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Upload Custom Sprite (PNG, JPG, GIF, WebP, max 2MB, 128x128px)
      </Typography>
      <FileUpload
        accept={["image/png", "image/jpeg", "image/gif", "image/webp"]}
        maxSize={2 * 1024 * 1024}
        onUpload={handleUpload}
        onError={setError}
      />
      {loading && (
        <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="body2">Processing...</Typography>
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};
