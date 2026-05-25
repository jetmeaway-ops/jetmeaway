/**
 * BestValueTable — original-data ranking for the "Cheapest UK destinations
 * right now" post. Lowest one-way fare from London to each destination,
 * pulled from JetMeAway's live search feed (Travelpayouts / Aviasales
 * cached prices) and captured on the date below. Refresh by re-running the
 * per-destination price pull and updating CAPTURED + the rows.
 *
 * Static, server-renderable (no hooks) so it compiles inside MDX via
 * next-mdx-remote/rsc. Usable in any post as `<BestValueTable />`.
 */

const CAPTURED = '25 May 2026';

type Row = {
  rank: number;
  dest: string;
  code: string;
  country: string;
  from: number;
  month: string;
  tier: 'Short-haul' | 'Long-haul';
};

// Ranked cheapest → dearest. Real lowest one-way fares LON→dest.
const ROWS: Row[] = [
  { rank: 1, dest: 'Barcelona', code: 'BCN', country: 'Spain', from: 11, month: 'June', tier: 'Short-haul' },
  { rank: 2, dest: 'Palma', code: 'PMI', country: 'Spain', from: 11, month: 'June', tier: 'Short-haul' },
  { rank: 3, dest: 'Venice', code: 'VCE', country: 'Italy', from: 11, month: 'June', tier: 'Short-haul' },
  { rank: 4, dest: 'Rome', code: 'FCO', country: 'Italy', from: 12, month: 'May', tier: 'Short-haul' },
  { rank: 5, dest: 'Milan', code: 'MXP', country: 'Italy', from: 12, month: 'June', tier: 'Short-haul' },
  { rank: 6, dest: 'Antalya', code: 'AYT', country: 'Turkey', from: 12, month: 'July', tier: 'Short-haul' },
  { rank: 7, dest: 'Alicante', code: 'ALC', country: 'Spain', from: 14, month: 'June', tier: 'Short-haul' },
  { rank: 8, dest: 'Krakow', code: 'KRK', country: 'Poland', from: 14, month: 'June', tier: 'Short-haul' },
  { rank: 9, dest: 'Dublin', code: 'DUB', country: 'Ireland', from: 15, month: 'May', tier: 'Short-haul' },
  { rank: 10, dest: 'Faro', code: 'FAO', country: 'Portugal', from: 16, month: 'May', tier: 'Short-haul' },
  { rank: 11, dest: 'Malaga', code: 'AGP', country: 'Spain', from: 18, month: 'August', tier: 'Short-haul' },
  { rank: 12, dest: 'Budapest', code: 'BUD', country: 'Hungary', from: 20, month: 'June', tier: 'Short-haul' },
  { rank: 13, dest: 'Amsterdam', code: 'AMS', country: 'Netherlands', from: 21, month: 'June', tier: 'Short-haul' },
  { rank: 14, dest: 'Paris', code: 'CDG', country: 'France', from: 23, month: 'July', tier: 'Short-haul' },
  { rank: 15, dest: 'Marrakech', code: 'RAK', country: 'Morocco', from: 26, month: 'June', tier: 'Short-haul' },
  { rank: 16, dest: 'Athens', code: 'ATH', country: 'Greece', from: 33, month: 'June', tier: 'Short-haul' },
  { rank: 17, dest: 'Istanbul', code: 'IST', country: 'Turkey', from: 34, month: 'August', tier: 'Short-haul' },
  { rank: 18, dest: 'Lisbon', code: 'LIS', country: 'Portugal', from: 39, month: 'August', tier: 'Short-haul' },
  { rank: 19, dest: 'Dubai', code: 'DXB', country: 'UAE', from: 144, month: 'June', tier: 'Long-haul' },
  { rank: 20, dest: 'Islamabad', code: 'ISB', country: 'Pakistan', from: 178, month: 'August', tier: 'Long-haul' },
  { rank: 21, dest: 'Mumbai', code: 'BOM', country: 'India', from: 210, month: 'June', tier: 'Long-haul' },
  { rank: 22, dest: 'Delhi', code: 'DEL', country: 'India', from: 221, month: 'June', tier: 'Long-haul' },
  { rank: 23, dest: 'New York', code: 'JFK', country: 'USA', from: 223, month: 'June', tier: 'Long-haul' },
  { rank: 24, dest: 'Bangkok', code: 'BKK', country: 'Thailand', from: 257, month: 'June', tier: 'Long-haul' },
  { rank: 25, dest: 'Maldives', code: 'MLE', country: 'Maldives', from: 276, month: 'June', tier: 'Long-haul' },
];

export default function BestValueTable() {
  return (
    <div className="my-8">
      <div className="overflow-x-auto rounded-2xl border border-[#E8ECF4] shadow-[0_8px_28px_-16px_rgba(0,102,255,0.18)]">
        <table className="w-full border-collapse text-left text-[.9rem]">
          <thead>
            <tr className="bg-[#0a1628] text-white">
              <th className="px-4 py-3 font-poppins font-bold">#</th>
              <th className="px-4 py-3 font-poppins font-bold">Destination</th>
              <th className="px-4 py-3 font-poppins font-bold whitespace-nowrap">From*</th>
              <th className="px-4 py-3 font-poppins font-bold">Cheapest month</th>
              <th className="px-4 py-3 font-poppins font-bold">Type</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={r.code} className={i % 2 ? 'bg-[#F8FAFC]' : 'bg-white'}>
                <td className="px-4 py-3 font-black text-[#8E95A9]">{r.rank}</td>
                <td className="px-4 py-3 font-bold text-[#1A1D2B]">
                  {r.dest} <span className="text-[#8E95A9] font-semibold">({r.code})</span>
                  <span className="block text-[.72rem] text-[#8E95A9] font-semibold">{r.country}</span>
                </td>
                <td className="px-4 py-3 font-black text-[#0066FF] whitespace-nowrap">£{r.from}</td>
                <td className="px-4 py-3">
                  <span className="inline-block bg-green-50 text-green-700 font-bold px-2.5 py-1 rounded-full text-[.8rem]">
                    {r.month}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#5C6378] font-semibold whitespace-nowrap text-[.8rem]">{r.tier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[.78rem] text-[#8E95A9] font-medium leading-relaxed mt-3">
        *Lowest one-way fare from London observed for that destination via JetMeAway&apos;s live
        search feed, captured {CAPTURED}. Short-haul fares are direct low-cost-carrier base fares;
        long-haul fares are the cheapest one-way found and usually involve a connection. Fares are
        indicative starting prices and change constantly — search live before you book.
      </p>
    </div>
  );
}
