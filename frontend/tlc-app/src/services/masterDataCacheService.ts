import apiClient from './apiClient';
import type { District, Block, Teacher, TLCGroup, Coach } from '../types';
import { enhancedDb } from '../db/enhancedDb';

const CACHE_DURATIONS = {
  districts: 24 * 60 * 60 * 1000, // 24 hours
  blocks: 24 * 60 * 60 * 1000,
  teachers: 6 * 60 * 60 * 1000, // 6 hours - changes more frequently
  coaches: 24 * 60 * 60 * 1000,
  tlcGroups: 12 * 60 * 60 * 1000, // 12 hours
};

/**
 * Check if cached data is still valid
 */
function isCacheValid(expiresAt: number): boolean {
  return expiresAt > Date.now();
}

/**
 * Fetch with intelligent caching strategy
 * Priority: Online → Fresh Cache → Stale Cache → Empty Array
 */
async function fetchWithCache<T>(
  key: string,
  cacheKey: keyof typeof CACHE_DURATIONS,
  fetcher: () => Promise<{ data: T; version?: number }>,
  version: number = 1
): Promise<{ data: T; isFresh: boolean }> {
  const cacheDuration = CACHE_DURATIONS[cacheKey];
  const expiresAt = Date.now() + cacheDuration;

  // Try to fetch fresh data if online
  if (navigator.onLine) {
    try {
      const response = await fetcher();
      const newVersion = response.version || version;

      await enhancedDb.masterDataCache.put({
        key,
        data: response.data,
        version: newVersion,
        cachedAt: Date.now(),
        expiresAt,
      });

      console.log(`[MasterDataCache] ✓ Updated ${key} from server`);
      return { data: response.data, isFresh: true };
    } catch (error) {
      console.warn(`[MasterDataCache] Failed to fetch ${key}:`, error);
      // Fall through to cached data
    }
  }

  // Use cached data
  const cached = await enhancedDb.masterDataCache.get(key);

  if (cached) {
    const isFresh = isCacheValid(cached.expiresAt);
    console.log(`[MasterDataCache] Using ${isFresh ? 'fresh' : 'stale'} cache for ${key}`);
    return { data: cached.data as T, isFresh };
  }

  console.log(`[MasterDataCache] No cache for ${key}, returning empty`);
  return { data: ([] as unknown as T), isFresh: false };
}

/**
 * Get districts with caching
 */
export async function getDistricts(forceRefresh: boolean = false): Promise<{
  data: District[];
  isFresh: boolean;
}> {
  if (forceRefresh) {
    await enhancedDb.masterDataCache.delete('districts');
  }

  return fetchWithCache<District[]>(
    'districts',
    'districts',
    () => apiClient.getDistricts(),
    1
  );
}

/**
 * Get blocks for a district with caching
 */
export async function getBlocks(
  districtId: number,
  forceRefresh: boolean = false
): Promise<{ data: Block[]; isFresh: boolean }> {
  const key = `blocks_${districtId}`;

  if (forceRefresh) {
    await enhancedDb.masterDataCache.delete(key);
  }

  return fetchWithCache<Block[]>(key, 'blocks', () => apiClient.getBlocks(districtId), 1);
}

/**
 * Get teachers with caching
 * Note: Teachers data can be large, consider pagination in production
 */
export async function getTeachers(forceRefresh: boolean = false): Promise<{
  data: Teacher[];
  isFresh: boolean;
}> {
  if (forceRefresh) {
    await enhancedDb.masterDataCache.delete('teachers');
  }

  return fetchWithCache<Teacher[]>(
    'teachers',
    'teachers',
    () => apiClient.getTeachers(),
    1
  );
}

/**
 * Get teachers by district for faster queries
 */
export async function getTeachersByDistrict(
  districtId: number,
  forceRefresh: boolean = false
): Promise<{ data: Teacher[]; isFresh: boolean }> {
  const key = `teachers_${districtId}`;

  if (forceRefresh) {
    await enhancedDb.masterDataCache.delete(key);
  }

  return fetchWithCache<Teacher[]>(
    key,
    'teachers',
    async () => {
      const result = await apiClient.get(`/teachers?districtId=${districtId}`);
      return result;
    },
    1
  );
}

/**
 * Get TLC groups with caching
 */
export async function getTLCGroups(forceRefresh: boolean = false): Promise<{
  data: TLCGroup[];
  isFresh: boolean;
}> {
  if (forceRefresh) {
    await enhancedDb.masterDataCache.delete('tlcgroups');
  }

  return fetchWithCache<TLCGroup[]>(
    'tlcgroups',
    'tlcGroups',
    () => apiClient.getTLCGroups(),
    1
  );
}

/**
 * Get TLC groups by district
 */
export async function getTLCGroupsByDistrict(
  districtId: number,
  forceRefresh: boolean = false
): Promise<{ data: TLCGroup[]; isFresh: boolean }> {
  const key = `tlcgroups_${districtId}`;

  if (forceRefresh) {
    await enhancedDb.masterDataCache.delete(key);
  }

  return fetchWithCache<TLCGroup[]>(
    key,
    'tlcGroups',
    async () => {
      const result = await apiClient.get(`/tlcgroups?districtId=${districtId}`);
      return result;
    },
    1
  );
}

/**
 * Get coaches with caching
 */
export async function getCoaches(forceRefresh: boolean = false): Promise<{
  data: Coach[];
  isFresh: boolean;
}> {
  if (forceRefresh) {
    await enhancedDb.masterDataCache.delete('coaches');
  }

  return fetchWithCache<Coach[]>(
    'coaches',
    'coaches',
    () => apiClient.getCoaches?.() || Promise.resolve({ data: [] }),
    1
  );
}

/**
 * Pre-load all master data for offline mode
 * Call this on app startup or when user navigates to main section
 */
export async function preloadMasterData(): Promise<{
  loaded: number;
  failed: number;
}> {
  console.log('[MasterDataCache] Starting preload...');

  if (!navigator.onLine) {
    console.log('[MasterDataCache] Offline - skipping preload');
    return { loaded: 0, failed: 0 };
  }

  let loaded = 0;
  let failed = 0;

  const operations: Array<Promise<any>> = [
    getDistricts(true),
    getTLCGroups(true),
    getCoaches(true),
  ];

  // Load teachers and blocks if user has a specific district
  const districtId = localStorage.getItem('userDistrictId');
  if (districtId) {
    operations.push(
      getTeachersByDistrict(parseInt(districtId), true),
      getBlocks(parseInt(districtId), true)
    );
  }

  const results = await Promise.allSettled(operations);

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      loaded++;
      console.log(`[MasterDataCache] ✓ Loaded item ${index + 1}`);
    } else {
      failed++;
      console.error(`[MasterDataCache] ✗ Failed to load item ${index + 1}:`, result.reason);
    }
  });

  console.log(`[MasterDataCache] Preload complete: ${loaded} loaded, ${failed} failed`);
  return { loaded, failed };
}

/**
 * Clear all master data cache
 */
export async function clearMasterDataCache(): Promise<void> {
  const allKeys = (await enhancedDb.masterDataCache.toCollection().keys()) as string[];
  await enhancedDb.masterDataCache.bulkDelete(allKeys);
  console.log('[MasterDataCache] Cache cleared');
}

/**
 * Get cache statistics for debugging
 */
export async function getMasterDataCacheStats(): Promise<{
  totalEntries: number;
  freshEntries: number;
  staleEntries: number;
  totalSize: number;
}> {
  const entries = await enhancedDb.masterDataCache.toArray();

  let freshCount = 0;
  let totalSize = 0;

  entries.forEach((entry: any): void => {
    if (isCacheValid(entry.expiresAt)) {
      freshCount++;
    }
    totalSize += JSON.stringify(entry.data).length;
  });

  return {
    totalEntries: entries.length,
    freshEntries: freshCount,
    staleEntries: entries.length - freshCount,
    totalSize,
  };
}

/**
 * Refresh specific cache entry
 */
export async function refreshCacheEntry(key: string): Promise<void> {
  await enhancedDb.masterDataCache.delete(key);
  console.log(`[MasterDataCache] Cleared cache for ${key}`);
}

/**
 * Refresh all cache entries for a data type
 */
export async function refreshDataType(type: keyof typeof CACHE_DURATIONS): Promise<void> {
  const keys = (await enhancedDb.masterDataCache.toCollection().keys()) as string[];
  const keysToDelete = keys.filter((k: any): boolean => k.startsWith(type));

  await enhancedDb.masterDataCache.bulkDelete(keysToDelete as string[]);
  console.log(`[MasterDataCache] Cleared ${keysToDelete.length} cache entries for ${type}`);
}

/**
 * Check if cache is stale and needs refresh
 */
export async function isCacheStale(key: string): Promise<boolean> {
  const entry = await enhancedDb.masterDataCache.get(key);

  if (!entry) {
    return true;
  }

  return !isCacheValid(entry.expiresAt);
}


