/* ═══════════════════════════════════════════════════════════════════════════
   ROOMS SKELETON
   Shape-matched placeholder for the RoomsTable. Stops the "page jumps when
   rates land" effect by reserving the exact layout (title bar, 3 rate rows,
   per-row CTA) up front. Keeps the same outer card so the surrounding grid
   columns don't shift once real rates arrive.
   ═══════════════════════════════════════════════════════════════════════════ */

export default function RoomsSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading rates"
      className="bg-white border border-[#E8ECF4] rounded-3xl p-6 md:p-8 mb-5 shadow-[0_4px_24px_rgba(10,22,40,0.04)]"
    >
      {/* Table header */}
      <div className="flex items-center justify-between mb-5">
        <div className="animate-pulse h-5 w-40 bg-[#F1F3F7] rounded" />
        <div className="animate-pulse h-4 w-24 bg-[#F1F3F7] rounded" />
      </div>

      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="animate-pulse grid grid-cols-1 md:grid-cols-[1fr_auto_140px] gap-4 items-center border border-[#EEF1F6] rounded-2xl p-4 md:p-5"
          >
            {/* Room name + two fact chips */}
            <div className="space-y-2">
              <div className="h-4 w-2/3 bg-[#F1F3F7] rounded" />
              <div className="flex gap-2">
                <div className="h-3 w-24 bg-[#F4F6FA] rounded-full" />
                <div className="h-3 w-20 bg-[#F4F6FA] rounded-full" />
              </div>
            </div>
            {/* Price block */}
            <div className="hidden md:flex flex-col items-end gap-1.5">
              <div className="h-6 w-20 bg-[#F1F3F7] rounded" />
              <div className="h-3 w-16 bg-[#F4F6FA] rounded" />
            </div>
            {/* CTA */}
            <div className="h-10 w-full md:w-[140px] bg-[#E6ECF5] rounded-xl" />
          </div>
        ))}
      </div>
    </section>
  );
}
