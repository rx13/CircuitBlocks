import React, { useState, useCallback, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Paper,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Stack,
  Divider,
  Card,
  CardContent,
  useTheme,
  alpha,
  TextField,
} from '@mui/material';
import {
  Close as CloseIcon,
  Brush as BrushIcon,
  Delete as EraseIcon,
  FormatColorFill as BucketIcon,
  Colorize as DropperIcon,
  Add as AddIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import SpriteDrawer from './SpriteDrawer';
import { Pixel, PixelsEqual, Sprite } from './Sprite';
import { CustomSpriteUpload } from './CustomSpriteUpload';
import { CustomSpriteList } from './CustomSpriteList';
import Editor from '../..';

interface SpriteLibraryItem {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  src: string; // file path or base64
  width: number;
  height: number;
  customData?: any;
}

interface SpriteEditorProps {
  close: () => void;
  sprites: Sprite[];
}

const ModernSpriteEditor: React.FC<SpriteEditorProps> = ({ close, sprites }) => {
  const theme = useTheme();
  const [selected, setSelected] = useState(-1);
  const [editingSprite, setEditingSprite] = useState<Sprite | null>(null);
  const [colorRGB, setColorRGB] = useState<Pixel>({ r: 170, g: 0, b: 0, a: true });
  const [colorPicker, setColorPicker] = useState(false);
  const [selectedTool, setSelectedTool] = useState(0);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [library, setLibrary] = useState<SpriteLibraryItem[]>([]);
  const [customSprites, setCustomSprites] = useState<SpriteLibraryItem[]>([]);
  const [defaultSprites, setDefaultSprites] = useState<SpriteLibraryItem[]>([]);
  const [sizeWidth, setSizeWidth] = useState(32);
  const [sizeHeight, setSizeHeight] = useState(32);
  const [spriteName, setSpriteName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load default sprites on mount
  useEffect(() => {
    const defaults = Editor.DefaultSpriteNames.map((name: string, idx: number) => ({
      id: `predef-${idx}`,
      name,
      type: 'predefined' as const,
      src: require(`../../../../assets/sprites/${name}.png`),
      width: 32,
      height: 32,
    }));
    setDefaultSprites(defaults);
  }, []);

  // Load custom sprites on mount
  useEffect(() => {
    const loadCustomSprites = async () => {
      const { BrowserStorageManager } = await import('../../../../helpers/storage/BrowserStorageManager');
      const storage = new BrowserStorageManager();
      const all = await storage.loadAllCustomSprites();
      const items = all.map(sprite => ({
        id: sprite.id,
        name: sprite.name,
        type: 'custom' as const,
        src: sprite.thumbnail,
        width: sprite.width,
        height: sprite.height,
        customData: sprite,
      }));
      setCustomSprites(items);
    };
    loadCustomSprites();
  }, []);

  // Unified library: default + custom
  useEffect(() => {
    setLibrary([...defaultSprites, ...customSprites]);
  }, [defaultSprites, customSprites]);

  // When a sprite is selected, load it for editing
  const handleSpriteSelect = async (item: SpriteLibraryItem, idx: number) => {
    setSelected(idx);
    setError(null);
    let sprite: Sprite;
    if (item.type === 'predefined') {
      sprite = new Sprite(item.name, item.width, item.height);
      try {
        await sprite.fromFile(item.src);
      } catch (e: any) {
        setError('Failed to load sprite image.');
        setEditingSprite(null);
        return;
      }
    } else {
      // Custom: load from base64 or stored data
      sprite = new Sprite(item.name, item.width, item.height);
      if (item.customData && item.customData.imageData) {
        try {
          await sprite.fromFile(item.customData.imageData);
        } catch (e: any) {
          setError('Failed to load custom sprite image.');
          setEditingSprite(null);
          return;
        }
      } else if (item.src) {
        try {
          await sprite.fromFile(item.src);
        } catch (e: any) {
          setError('Failed to load custom sprite image.');
          setEditingSprite(null);
          return;
        }
      }
    }
    setEditingSprite(sprite);
    setSpriteName(sprite.name);
    setSizeWidth(sprite.width);
    setSizeHeight(sprite.height);
  };

  // Tool definitions
  const tools = [
    { name: 'Paint brush', icon: BrushIcon, key: 'brush' },
    { name: 'Eraser', icon: EraseIcon, key: 'eraser' },
    { name: 'Paint bucket', icon: BucketIcon, key: 'bucket' },
    { name: 'Color dropper', icon: DropperIcon, key: 'dropper' }
  ];

  const color = `rgba(${colorRGB.r}, ${colorRGB.g}, ${colorRGB.b}, ${colorRGB.a ? 255 : 0})`;

  const setWidth = useCallback((width: number) => {
    if (!editingSprite) return;
    editingSprite.updateSize(width, editingSprite.height);
    setSizeWidth(width);
    setRefreshCounter((c) => c + 1);
  }, [editingSprite]);

  const setHeight = useCallback((height: number) => {
    if (!editingSprite) return;
    editingSprite.updateSize(editingSprite.width, height);
    setSizeHeight(height);
    setRefreshCounter((c) => c + 1);
  }, [editingSprite]);

  const handleNameChange = (name: string) => {
    setSpriteName(name);
    if (editingSprite) {
      editingSprite.name = name;
      setRefreshCounter((c) => c + 1);
    }
  };

  const deleteSprite = useCallback(async () => {
    if (selected >= 0 && library[selected].type === 'custom') {
      const item = library[selected];
      const { BrowserStorageManager } = await import('../../../../helpers/storage/BrowserStorageManager');
      const storage = new BrowserStorageManager();
      await storage.deleteCustomSprite(item.id);
      setCustomSprites(prev => prev.filter(s => s.id !== item.id));
      setLibrary(lib => lib.filter(s => s.id !== item.id));
    }
    setEditingSprite(null);
    setSelected(-1);
  }, [selected, library]);

  const canvasAction = useCallback((x: number, y: number) => {
    if (!editingSprite) return;
    if (selectedTool === 0) {
      if (PixelsEqual(editingSprite.getPixel(x, y), colorRGB)) return;
      editingSprite.setPixel(x, y, colorRGB);
      setRefreshCounter((c) => c + 1);
    } else if (selectedTool === 1) {
      editingSprite.setPixel(x, y, { r: 0, g: 0, b: 0, a: false });
      setRefreshCounter((c) => c + 1);
    } else if (selectedTool === 2) {
      // Paint bucket
      // ...flood fill logic...
    } else if (selectedTool === 3) {
      setColorRGB(editingSprite.getPixel(x, y));
    }
  }, [editingSprite, selectedTool, colorRGB]);

  // Sprite library rendering
  const renderLibrary = () => (
    <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}`, background: '#fafafa' }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Sprite Library
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {library.map((item, idx) => (
          <Card
            key={item.id}
            elevation={selected === idx ? 4 : 1}
            onClick={() => handleSpriteSelect(item, idx)}
            sx={{
              minWidth: 60,
              cursor: 'pointer',
              border: selected === idx ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
              transition: theme.transitions.create(['border-color', 'elevation']),
              '&:hover': {
                elevation: 3,
              },
            }}
          >
            <CardContent sx={{
              p: 1,
              textAlign: 'center',
              '&:last-child': { pb: 1 },
              background: `
                linear-gradient(45deg, #f8f8f8 25%, transparent 25%),
                linear-gradient(-45deg, #f8f8f8 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #f8f8f8 75%),
                linear-gradient(-45deg, transparent 75%, #f8f8f8 75%)
              `,
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
              backgroundColor: '#ffffff',
              borderRadius: 1,
            }}>
              <img src={item.src} alt={item.name} style={{ maxWidth: 32, maxHeight: 32, display: 'block', margin: '0 auto' }} />
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {item.name}
              </Typography>
            </CardContent>
          </Card>
        ))}
        <Box>
          <CustomSpriteUpload onSpriteAdded={sprite => {
            // Add to customSprites and library
            const newItem: SpriteLibraryItem = {
              id: `custom-${Date.now()}`,
              name: sprite.name,
              type: 'custom',
              src: sprite.thumbnail,
              width: sprite.width,
              height: sprite.height,
              customData: sprite,
            };
            setCustomSprites(prev => [...prev, newItem]);
            setLibrary(lib => [...lib, newItem]);
          }} />
        </Box>
      </Stack>
    </Box>
  );

  return (
    <Dialog open={true} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" component="h2">
          Sprite Editor
        </Typography>
        <IconButton onClick={close} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '600px' }}>
        {/* Main layout: Toolbox | Canvas | Properties */}
        <Box sx={{ display: 'flex', flex: 1 }}>
          {/* Toolbox */}
          <Paper
            elevation={0}
            sx={{
              width: 80,
              borderRight: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              flexDirection: 'column',
              p: 1,
              gap: 1,
            }}
          >
            <ToggleButtonGroup
              orientation="vertical"
              value={selectedTool}
              exclusive
              onChange={(_, value) => value !== null && setSelectedTool(value)}
              sx={{ '& .MuiToggleButton-root': { border: 'none', borderRadius: 2 } }}
            >
              {tools.map((tool, i) => (
                <Tooltip key={tool.key} title={tool.name} placement="right">
                  <ToggleButton value={i} sx={{ p: 1.5 }}>
                    <tool.icon sx={{ fontSize: '1.5rem' }} />
                  </ToggleButton>
                </Tooltip>
              ))}
            </ToggleButtonGroup>
            <Divider sx={{ my: 1 }} />
            <Tooltip title="Color picker" placement="right">
              <IconButton
                onClick={() => setColorPicker(!colorPicker)}
                size="large"
                sx={{
                  border: colorPicker ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: `2px solid ${theme.palette.grey[300]}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PaletteIcon sx={{ fontSize: '1rem', color: 'white', mixBlendMode: 'difference' }} />
                </Box>
              </IconButton>
            </Tooltip>
            {colorPicker && (
              <Box sx={{ mt: 2, mb: 1 }}>
                {/* Simple color input as a fallback for a color wheel */}
                <input
                  type="color"
                  value={`#${((1 << 24) + (colorRGB.r << 16) + (colorRGB.g << 8) + colorRGB.b).toString(16).slice(1)}`}
                  onChange={e => {
                    const hex = e.target.value;
                    setColorRGB({
                      r: parseInt(hex.slice(1, 3), 16),
                      g: parseInt(hex.slice(3, 5), 16),
                      b: parseInt(hex.slice(5, 7), 16),
                      a: true,
                    });
                  }}
                  style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer' }}
                />
              </Box>
            )}
          </Paper>
          {/* Canvas */}
          <Box sx={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            {editingSprite ? (
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: `
                    linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                    linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                    linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                  `,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SpriteDrawer
                  width={360}
                  sprite={editingSprite}
                  onAction={canvasAction}
                  refreshKey={refreshCounter}
                />
              </Paper>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Select a sprite to edit
              </Typography>
            )}
          </Box>
          {/* Properties */}
          <Paper
            elevation={0}
            sx={{
              width: 220,
              borderLeft: `1px solid ${theme.palette.divider}`,
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography variant="subtitle2">Properties</Typography>
            <TextField
              label="Name"
              value={spriteName}
              onChange={e => handleNameChange(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Width"
                type="number"
                value={sizeWidth}
                onChange={e => setWidth(Number(e.target.value))}
                inputProps={{ min: 1, max: 128 }}
                size="small"
                sx={{ width: 80 }}
              />
              <Typography variant="body2" color="text.secondary">×</Typography>
              <TextField
                label="Height"
                type="number"
                value={sizeHeight}
                onChange={e => setHeight(Number(e.target.value))}
                inputProps={{ min: 1, max: 128 }}
                size="small"
                sx={{ width: 80 }}
              />
              <Typography variant="body2" color="text.secondary">px</Typography>
            </Box>
            <Button
              onClick={deleteSprite}
              variant="contained"
              color="error"
              startIcon={<EraseIcon />}
              disabled={editingSprite === null}
            >
              Delete Sprite
            </Button>
            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Paper>
        </Box>
        {/* Sprite Library at the bottom */}
        {renderLibrary()}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={close} variant="outlined">
          Close
        </Button>
        {editingSprite && (
          <Button
            onClick={async () => {
              // Save logic: update sprites array and persist custom sprites
              if (selected >= 0 && library[selected].type === 'custom') {
                const item = library[selected];
                const customSprite = {
                  id: item.id,
                  name: spriteName,
                  imageData: editingSprite.base64(),
                  width: editingSprite.width,
                  height: editingSprite.height,
                  created: item.customData?.created || new Date().toISOString(),
                  thumbnail: editingSprite.base64(), // Optionally generate a thumbnail
                };
                // Save to storage
                const { BrowserStorageManager } = await import('../../../../helpers/storage/BrowserStorageManager');
                const storage = new BrowserStorageManager();
                await storage.saveCustomSprite(customSprite);
                // Update state
                setCustomSprites(prev =>
                  prev.map(s => (s.id === item.id ? { ...s, ...customSprite, customData: customSprite, src: customSprite.imageData } : s))
                );
                setLibrary(lib =>
                  lib.map(s => (s.id === item.id ? { ...s, ...customSprite, customData: customSprite, src: customSprite.imageData } : s))
                );
              }
              close();
            }}
            variant="contained"
            color="primary"
          >
            Save Sprite
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default class SpriteEditor extends React.Component<SpriteEditorProps> {
  render() {
    return <ModernSpriteEditor {...this.props} />;
  }
}
