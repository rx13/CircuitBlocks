// BrowserStorageManager.ts
// IndexedDB implementation of StorageManager for browser context

import { SavedSketch, StorageManager, CustomSpriteData } from "./StorageManager";

const DB_NAME = "CircuitBlocksSketches";
const STORE_NAME = "sketches";
const CUSTOM_SPRITE_STORE = "custom_sprites";
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CUSTOM_SPRITE_STORE)) {
        db.createObjectStore(CUSTOM_SPRITE_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class BrowserStorageManager implements StorageManager {
  constructor() {}

  // Sketch methods
  async saveSketch(sketch: SavedSketch): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(sketch);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadSketch(id: string): Promise<SavedSketch | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async loadAllSketches(): Promise<SavedSketch[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as SavedSketch[]);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteSketch(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async searchSketches(query: string): Promise<SavedSketch[]> {
    const all = await this.loadAllSketches();
    const q = query.toLowerCase();
    return all.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        s.device.toLowerCase().includes(q)
    );
  }

  // Custom sprite methods
  async saveCustomSprite(sprite: CustomSpriteData): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CUSTOM_SPRITE_STORE, "readwrite");
      tx.objectStore(CUSTOM_SPRITE_STORE).put(sprite);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadCustomSprite(id: string): Promise<CustomSpriteData | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CUSTOM_SPRITE_STORE, "readonly");
      const req = tx.objectStore(CUSTOM_SPRITE_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async loadAllCustomSprites(): Promise<CustomSpriteData[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CUSTOM_SPRITE_STORE, "readonly");
      const req = tx.objectStore(CUSTOM_SPRITE_STORE).getAll();
      req.onsuccess = () => resolve(req.result as CustomSpriteData[]);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteCustomSprite(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CUSTOM_SPRITE_STORE, "readwrite");
      tx.objectStore(CUSTOM_SPRITE_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
