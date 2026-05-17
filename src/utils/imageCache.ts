/**
 * Browser-based image caching utility using IndexedDB
 * Stores downloaded images locally to avoid repeated downloads
 */

const DB_NAME = "merdeleine-image-cache";
const STORE_NAME = "images";
const DB_VERSION = 1;

interface CachedImage {
  url: string;
  blob: Blob;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };
  });

  return dbPromise;
}

async function getCachedBlob(url: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(url);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CachedImage | undefined;
        resolve(result?.blob ?? null);
      };
    });
  } catch (error) {
    console.error("Error reading from image cache:", error);
    return null;
  }
}

async function setCachedBlob(url: string, blob: Blob): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        url,
        blob,
        timestamp: Date.now(),
      } as CachedImage);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error("Error writing to image cache:", error);
  }
}

/**
 * Fetch image with caching
 * Returns blob URL string that can be used as img src
 */
export async function fetchImageWithCache(url: string): Promise<string> {
  // Cross-origin images often block fetch() without CORS headers.
  // Fall back to direct URL to avoid noisy console errors.
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return url;
    }
  } catch {
    return url;
  }

  // Check if already cached
  const cachedBlob = await getCachedBlob(url);
  if (cachedBlob) {
    return URL.createObjectURL(cachedBlob);
  }

  // Fetch and cache
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    await setCachedBlob(url, blob);
    return URL.createObjectURL(blob);
  } catch (error) {
    // Fallback to direct URL
    return url;
  }
}

/**
 * Get cached blob URL directly without fetching
 */
export async function getCachedImageUrl(url: string): Promise<string | null> {
  const blob = await getCachedBlob(url);
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * Clear all cached images
 */
export async function clearImageCache(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error("Error clearing image cache:", error);
  }
}

/**
 * Get cache size statistics
 */
export async function getImageCacheStats(): Promise<{ count: number; urls: string[] }> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => resolve({ count: 0, urls: [] });
      request.onsuccess = () => {
        const results = request.result as CachedImage[];
        resolve({
          count: results.length,
          urls: results.map((r) => r.url),
        });
      };
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return { count: 0, urls: [] };
  }
}
