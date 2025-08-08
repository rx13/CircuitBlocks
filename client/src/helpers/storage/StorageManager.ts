// StorageManager.ts
// Abstract interface for sketch storage

export interface SavedSketch {
  id: string;
  title: string;
  device: string;
  type: 'block' | 'code';
  data: string;
  sprites?: any[];
  snapshot?: string;
  description?: string;
  lastModified: string;
  created: string;
}

export interface CustomSpriteData {
  id: string;
  name: string;
  imageData: string; // base64 PNG
  width: number;
  height: number;
  created: string;
  thumbnail: string; // base64 PNG thumbnail
}

export interface StorageManager {
  saveSketch(sketch: SavedSketch): Promise<void>;
  loadSketch(id: string): Promise<SavedSketch | null>;
  loadAllSketches(): Promise<SavedSketch[]>;
  deleteSketch(id: string): Promise<void>;
  searchSketches(query: string): Promise<SavedSketch[]>;
  // Custom sprite methods
  saveCustomSprite(sprite: CustomSpriteData): Promise<void>;
  loadCustomSprite(id: string): Promise<CustomSpriteData | null>;
  loadAllCustomSprites(): Promise<CustomSpriteData[]>;
  deleteCustomSprite(id: string): Promise<void>;
}
