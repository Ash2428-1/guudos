'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-[#0e9f6e] px-4 py-2 text-sm font-semibold text-white print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
