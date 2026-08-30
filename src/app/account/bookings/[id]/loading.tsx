/** Skeleton while the booking loads — every dynamic route ships one so a slow
 *  KV read never leaves the customer staring at a blank page. */
export default function Loading() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] pt-28 pb-16">
      <div className="max-w-2xl mx-auto px-4">
        <div className="h-4 w-28 rounded bg-[#E8ECF4] animate-pulse mb-4" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mt-4 first:mt-0">
            <div className="h-3 w-24 rounded bg-[#E8ECF4] animate-pulse mb-4" />
            <div className="h-5 w-3/4 rounded bg-[#F1F3F7] animate-pulse mb-2" />
            <div className="h-4 w-1/2 rounded bg-[#F1F3F7] animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}
