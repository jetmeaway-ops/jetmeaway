import DevSeatMapClient from './DevSeatMapClient';

export const runtime = 'edge';

export const metadata = {
  title: 'SeatMap preview pane (dev)',
  robots: { index: false, follow: false },
};

export default function SeatMapPreviewDevPage() {
  return (
    <main className="min-h-dvh bg-[#0a1628]/40">
      <DevSeatMapClient />
    </main>
  );
}
