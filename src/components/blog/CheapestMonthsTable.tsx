/**
 * CheapestMonthsTable — original-data table for the "Cheapest Months to Fly
 * from the UK" flagship post. Data is JetMeAway's own lowest observed fares
 * per departure month, pulled from our live search feed (Travelpayouts /
 * Aviasales) and captured on the date below. Refresh by re-running the
 * month-grouped fare pull and updating CAPTURED + the rows.
 *
 * Static, server-renderable (no hooks) so it compiles inside MDX via
 * next-mdx-remote/rsc. Usable in any post as `<CheapestMonthsTable />`.
 */

const CAPTURED = '24 May 2026';

type Row = {
  dest: string;
  code: string;
  cheapMonth: string;
  from: number;
  dearMonth: string;
  dear: number;
  save: number;
};

// Europe & short-haul (lowest fares are one-way LCC base fares).
const SHORT: Row[] = [
  { dest: 'Barcelona', code: 'BCN', cheapMonth: 'June', from: 13, dearMonth: 'March', dear: 67, save: 81 },
  { dest: 'Antalya', code: 'AYT', cheapMonth: 'June', from: 12, dearMonth: 'January', dear: 53, save: 77 },
  { dest: 'Paris', code: 'CDG', cheapMonth: 'July', from: 23, dearMonth: 'December', dear: 77, save: 70 },
  { dest: 'Malaga', code: 'AGP', cheapMonth: 'April', from: 15, dearMonth: 'July', dear: 47, save: 68 },
  { dest: 'Amsterdam', code: 'AMS', cheapMonth: 'June', from: 20, dearMonth: 'March', dear: 62, save: 68 },
  { dest: 'Athens', code: 'ATH', cheapMonth: 'October', from: 22, dearMonth: 'July', dear: 62, save: 65 },
  { dest: 'Rome', code: 'FCO', cheapMonth: 'May', from: 12, dearMonth: 'August', dear: 33, save: 64 },
  { dest: 'Istanbul', code: 'IST', cheapMonth: 'September', from: 26, dearMonth: 'May', dear: 69, save: 62 },
  { dest: 'Marrakech', code: 'RAK', cheapMonth: 'June', from: 26, dearMonth: 'March', dear: 68, save: 62 },
  { dest: 'Lisbon', code: 'LIS', cheapMonth: 'September', from: 30, dearMonth: 'February', dear: 66, save: 55 },
];

// Long-haul & beyond.
const LONG: Row[] = [
  { dest: 'Dubai', code: 'DXB', cheapMonth: 'June', from: 142, dearMonth: 'April', dear: 270, save: 47 },
  { dest: 'Islamabad', code: 'ISB', cheapMonth: 'August', from: 178, dearMonth: 'May', dear: 329, save: 46 },
  { dest: 'Maldives', code: 'MLE', cheapMonth: 'June', from: 276, dearMonth: 'April', dear: 457, save: 40 },
  { dest: 'Mumbai', code: 'BOM', cheapMonth: 'September', from: 182, dearMonth: 'April', dear: 307, save: 41 },
  { dest: 'Lahore', code: 'LHE', cheapMonth: 'October', from: 286, dearMonth: 'July', dear: 468, save: 39 },
  { dest: 'Delhi', code: 'DEL', cheapMonth: 'June', from: 221, dearMonth: 'April', dear: 342, save: 35 },
  { dest: 'Bangkok', code: 'BKK', cheapMonth: 'September', from: 254, dearMonth: 'April', dear: 379, save: 33 },
  { dest: 'New York', code: 'JFK', cheapMonth: 'June', from: 223, dearMonth: 'May', dear: 327, save: 32 },
];

function Table({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="my-8">
      <h3 className="font-poppins text-[1.05rem] md:text-[1.15rem] font-black text-[#1A1D2B] mb-3">{title}</h3>
      <div className="overflow-x-auto rounded-2xl border border-[#E8ECF4] shadow-[0_8px_28px_-16px_rgba(0,102,255,0.18)]">
        <table className="w-full border-collapse text-left text-[.9rem]">
          <thead>
            <tr className="bg-[#0a1628] text-white">
              <th className="px-4 py-3 font-poppins font-bold">Destination</th>
              <th className="px-4 py-3 font-poppins font-bold">Cheapest month</th>
              <th className="px-4 py-3 font-poppins font-bold whitespace-nowrap">From*</th>
              <th className="px-4 py-3 font-poppins font-bold">Priciest month</th>
              <th className="px-4 py-3 font-poppins font-bold whitespace-nowrap">You save†</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.code} className={i % 2 ? 'bg-[#F8FAFC]' : 'bg-white'}>
                <td className="px-4 py-3 font-bold text-[#1A1D2B]">
                  {r.dest} <span className="text-[#8E95A9] font-semibold">({r.code})</span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block bg-green-50 text-green-700 font-bold px-2.5 py-1 rounded-full text-[.8rem]">
                    {r.cheapMonth}
                  </span>
                </td>
                <td className="px-4 py-3 font-black text-[#0066FF] whitespace-nowrap">£{r.from}</td>
                <td className="px-4 py-3 text-[#5C6378] whitespace-nowrap">{r.dearMonth} (£{r.dear})</td>
                <td className="px-4 py-3 font-bold text-[#1A1D2B] whitespace-nowrap">{r.save}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CheapestMonthsTable() {
  return (
    <div>
      <Table title="Europe & short-haul" rows={SHORT} />
      <Table title="Long-haul & beyond" rows={LONG} />
      <p className="text-[.78rem] text-[#8E95A9] font-medium leading-relaxed mt-3">
        *Lowest one-way fare observed for that departure month via JetMeAway&apos;s live search
        feed, captured {CAPTURED}. Long-haul fares shown are the lowest return-equivalent found.
        †&ldquo;You save&rdquo; compares the cheapest month against the most expensive month for the same route.
        Fares are indicative starting prices and change constantly — search live before you book.
      </p>
    </div>
  );
}
