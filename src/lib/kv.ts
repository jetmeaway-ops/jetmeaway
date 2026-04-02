import { kv } from '@vercel/kv';

export type SearchEntry = {
  origin: string;
  destination: string;
  date: string;
};

/**
 * PERSONAL SCOUT LOGIC
 * This fetches the user's last 3 searches from Vercel KV 
 * to make the site feel "Sticky" and personal.
 */
export async function getRecentSearches(userId: string): Promise<SearchEntry[]> {
  try {
    const history = await kv.get<SearchEntry[]>(`history:${userId}`);
    return history || [];
  } catch (error) {
    console.error("Scout Error: Could not fetch history", error);
    return [];
  }
}

/**
 * This saves a new search. 
 * It automatically removes duplicates and keeps only the 3 most recent.
 */
export async function saveSearch(userId: string, search: SearchEntry) {
  try {
    const key = `history:${userId}`;
    const history = await getRecentSearches(userId);
    
    // Clean up: Remove the search if it's already in the list to avoid duplicates
    const filteredHistory = history.filter(
      (item) => !(item.origin === search.origin && item.destination === search.destination)
    );

    // Add the new search to the front and keep only the top 3
    const updatedHistory = [search, ...filteredHistory].slice(0, 3);
    
    await kv.set(key, updatedHistory);
  } catch (error) {
    console.error("Scout Error: Could not save search", error);
  }
}