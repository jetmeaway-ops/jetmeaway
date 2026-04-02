'use client';

import { useState } from 'react';
import { handleSaveSearch } from './actions'; 

export default function FlightSearch() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]); // To hold hotel/flight data

  const userId = 'user_123'; 

  const handleSearch = async () => {
    if (!origin || !destination) return alert("Please enter both cities!");

    setIsLoading(true);
    setResults([]); // Clear old results

    try {
      // 1. Save to Scout (KV Memory)
      await handleSaveSearch(userId, {
        origin,
        destination,
        date: new Date().toISOString().split('T')[0]
      });

      // 2. TRIGGER THE SEARCH (Simulating the fast scout results)
      // In a full build, you'd fetch('/api/scout') here. 
      // For now, let's generate the results to fix your "broken image" issue.
      const mockResults = [
        {
          id: 1,
          name: "The Luxury Scout Plaza",
          price: "£140/night",
          image: `https://cf.bstatic.com/xdata/images/hotel/max1024x768/123456.jpg`, // Example potential broken link
        },
        {
          id: 2,
          name: "Grand JetMeAway Suites",
          price: "£210/night",
          image: `https://images.trvl-media.com/hotels/1000000/50000/47400/47304/47304_123_z.jpg`,
        }
      ];

      setResults(mockResults);

    } catch (error) {
      console.error(error);
      alert("Something went wrong with the connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 text-black">Where to next?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="From (e.g. LHR)"
            className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
            value={origin}
            onChange={(e) => setOrigin(e.target.value.toUpperCase())}
          />
          <input
            type="text"
            placeholder="To (e.g. JFK)"
            className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
            value={destination}
            onChange={(e) => setDestination(e.target.value.toUpperCase())}
          />
        </div>

        <button 
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
          onClick={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? "Scout is Searching..." : "Search & Save to Scout"}
        </button>
      </div>

      {/* RESULT GALLERY - This fixes the broken images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((item) => (
          <div key={item.id} className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
            <img 
              src={item.image} 
              alt={item.name}
              className="w-full h-48 object-cover"
              // THE FIX: If the real-time link is broken, use a clean travel placeholder
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80";
              }}
            />
            <div className="p-4">
              <h3 className="font-bold text-slate-900">{item.name}</h3>
              <p className="text-blue-600 font-semibold">{item.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}