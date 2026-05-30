import apiClient from './apiClient';
import { db } from '../db/localDb';
import type { District, Block, TLCGroup, Teacher } from '../types';

async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<{ data: T }>,
): Promise<T> {
  if (navigator.onLine) {
    try {
      const r = await fetcher();
      await db.masterDataCache.put({ key, data: r.data, cachedAt: Date.now() });
      return r.data;
    } catch {
      // fall through to cached data
    }
  }
  const cached = await db.masterDataCache.get(key);
  return (cached?.data as T) ?? ([] as unknown as T);
}

export const getDistricts = () =>
  fetchWithCache<District[]>('districts', () => apiClient.getDistricts());

export const getTeachers = () =>
  fetchWithCache<Teacher[]>('teachers', () => apiClient.getTeachers());

export const getBlocks = (districtId: number) =>
  fetchWithCache<Block[]>(`blocks_${districtId}`, () =>
    apiClient.getBlocks(districtId),
  );

export const getTLCGroups = () =>
  fetchWithCache<TLCGroup[]>('tlcgroups', () => apiClient.getTLCGroups());
