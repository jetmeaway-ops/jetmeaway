import CabinViewer from './CabinViewer';

export const runtime = 'edge';

export const metadata = {
  title: 'Cabin 3D Viewer (dev)',
  robots: { index: false, follow: false },
};

export default function CabinDevPage() {
  return (
    <main className="relative h-dvh w-full bg-[#0a0d14]">
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur">
        <div className="font-semibold text-white">cabin-interior.glb</div>
        <div className="mt-0.5">drag to orbit · scroll to zoom · right-drag to pan</div>
      </div>
      <CabinViewer />
    </main>
  );
}
