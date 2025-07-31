// CustomSpriteList.tsx
import React, { useEffect, useState } from "react";
import { BrowserStorageManager } from "../../../../helpers/storage/BrowserStorageManager";
import type { CustomSpriteData } from "../../../../helpers/storage/StorageManager";
import { Box, Typography, IconButton, Tooltip, Stack, Card, CardContent } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

interface CustomSpriteListProps {
  onSelect: (sprite: CustomSpriteData) => void;
  onDelete?: (id: string) => void;
  selectedId?: string | null;
}

export const CustomSpriteList: React.FC<CustomSpriteListProps> = ({
  onSelect,
  onDelete,
  selectedId,
}) => {
  const [sprites, setSprites] = useState<CustomSpriteData[]>([]);

  useEffect(() => {
    const fetchSprites = async () => {
      const storage = new BrowserStorageManager();
      const all = await storage.loadAllCustomSprites();
      setSprites(all);
    };
    fetchSprites();
  }, []);

  const handleDelete = async (id: string) => {
    const storage = new BrowserStorageManager();
    await storage.deleteCustomSprite(id);
    setSprites((prev) => prev.filter((s) => s.id !== id));
    if (onDelete) onDelete(id);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Custom Sprites ({sprites.length})
      </Typography>
      <Stack direction="row" spacing={1} sx={{ pb: 1, flexWrap: "wrap" }}>
        {sprites.map((sprite) => (
          <Card
            key={sprite.id}
            elevation={selectedId === sprite.id ? 4 : 1}
            onClick={() => onSelect(sprite)}
            sx={{
              minWidth: 60,
              cursor: "pointer",
              border: selectedId === sprite.id ? "2px solid #1976d2" : "2px solid transparent",
              transition: "border-color 0.2s",
              position: "relative",
            }}
          >
            <CardContent
              sx={{
                p: 1,
                textAlign: "center",
                "&:last-child": { pb: 1 },
                background: `
                  linear-gradient(45deg, #f8f8f8 25%, transparent 25%),
                  linear-gradient(-45deg, #f8f8f8 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #f8f8f8 75%),
                  linear-gradient(-45deg, transparent 75%, #f8f8f8 75%)
                `,
                backgroundSize: "8px 8px",
                backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                backgroundColor: "#ffffff",
                borderRadius: 1,
              }}
            >
              <img
                src={sprite.thumbnail}
                alt={sprite.name}
                style={{ maxWidth: 32, maxHeight: 32, display: "block", margin: "0 auto" }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {sprite.name}
              </Typography>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    zIndex: 2,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(sprite.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </CardContent>
          </Card>
        ))}
      </Stack>
      {sprites.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No custom sprites uploaded yet.
        </Typography>
      )}
    </Box>
  );
};
