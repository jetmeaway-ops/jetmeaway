'use client';

/**
 * Tiny client button — opens the browser print dialog so fans can save the
 * checklist as a PDF or print it. Kept as its own client island so the page
 * stays a server component.
 */
export default function PrintButton({ label = 'Print / save as PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl border border-[#0066FF] px-5 py-2.5 font-poppins text-[.82rem] font-black text-[#0066FF] transition-colors hover:bg-blue-50"
    >
      <i className="fa-solid fa-download text-[.8rem]" aria-hidden="true" /> {label}
    </button>
  );
}
