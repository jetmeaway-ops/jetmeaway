'use server';

import { kv } from '@vercel/kv';

export type SearchEntry = {
  origin: string;
  destination: string;
  date: string;
};

export async function handleSaveSearch(userId: string, search: SearchEntry) {
  try {
    // 1. Get existing history
    const history = await kv.get<SearchEntry[]>(`history:${userId}`) || [];
    
    // 2. Add new search to the start (keep last 3)
    const newHistory = [search, ...history].slice(0, 3);
    
    // 3. Save it back to Vercel KV
    await kv.set(`history:${userId}`, newHistory);
    
    return { success: true };
  } catch (error) {
    console.error("KV Error:", error);
    return { success: false, error: "Failed to save to Scout" };
  }
}