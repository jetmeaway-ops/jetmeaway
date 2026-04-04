'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  X, Heart, Baby, Coffee, MapPin, Compass,
  Dumbbell, Waves, Sparkles, TreePine,
  PawPrint, Fish, Landmark, Film,
  UtensilsCrossed, ShoppingCart, Beer,
  Pill, Banknote, Mail, Train,
  Stethoscope, PersonStanding, IceCreamCone,
  type LucideIcon,
} from 'lucide-react';

const ScoutMap = dynamic(() => import('./ScoutMap'), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────
type ScoutPlace = {
  name: string;
  type: string;
  lat: number;
  lng: number;
  distance_m: number;
  walk_min: number;
};

type ScoutData = {
  hotel: { lat: number; lng: number };
  radius: number;
  quality: 'rich' | 'moderate' | 'thin' | 'empty';
  summary: { total: number; wellness: number; family: number; food: number; daily: number };
  categories: {
    wellness: ScoutPlace[];
    family: ScoutPlace[];
    food: ScoutPlace[];
    daily: ScoutPlace[];
  };
  cached: boolean;
  fallback: boolean;
  message?: string;
};

type Props = {
  hotelName: string;
  latitude: number;
  longitude: number;
  onClose: () => void;
};

// ── Icon mappings ─────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, LucideIcon> = {
  gym: Dumbbell,
  fitness_centre: Dumbbell,
  sports_centre: Dumbbell,
  yoga: PersonStanding,
  swimming: Waves,
  swimming_pool: Waves,
  spa: Sparkles,
  sauna: Sparkles,
  health_food: Sparkles,
  playground: Baby,
  park: TreePine,
  zoo: PawPrint,
  aquarium: Fish,
  theme_park: Sparkles,
  water_park: Waves,
  cinema: Film,
  library: Landmark,
  museum: Landmark,
  ice_cream: IceCreamCone,
  cafe: Coffee,
  restaurant: UtensilsCrossed,
  supermarket: ShoppingCart,
  convenience: ShoppingCart,
  bakery: Coffee,
  pub: Beer,
  pharmacy: Pill,
  bank: Banknote,
  atm: Banknote,
  post_office: Mail,
  station: Train,
  subway: Train,
  stop_position: Train,
  bus_stop: Train,
  hospital: Stethoscope,
  clinic: Stethoscope,
};

const TYPE_LABELS: Record<string, string> = {
  gym: 'Gym',
  fitness_centre: 'Fitness Centre',
  sports_centre: 'Sports Centre',
  yoga: 'Yoga Studio',
  swimming: 'Swimming',
  swimming_pool: 'Swimming Pool',
  spa: 'Spa',
  sauna: 'Sauna',
  health_food: 'Health Food Store',
  playground: 'Playground',
  park: 'Park',
  zoo: 'Zoo',
  aquarium: 'Aquarium',
  theme_park: 'Theme Park',
  water_park: 'Water Park',
  cinema: 'Cinema',
  library: 'Library',
  museum: 'Museum',
  ice_cream: 'Ice Cream',
  cafe: 'Cafe',
  restaurant: 'Restaurant',
  supermarket: 'Supermarket',
  convenience: 'Convenience Store',
  bakery: 'Bakery',
  pub: 'Pub',
  pharmacy: 'Pharmacy',
  bank: 'Bank',
  atm: 'ATM',
  post_office: 'Post Office',
  station: 'Train Station',
  subway: 'Metro Station',
  stop_position: 'Transport Stop',
  bus_stop: 'Bus Stop',
  hospital: 'Hospital',
  clinic: 'Clinic',
};

const CATEGORY_COLORS: Record<string, string> = {
  wellness: 'bg-emerald-500',
  family: 'bg-amber-500',
  food: 'bg-red-500',
  daily: 'bg-blue-500',
};

const TABS = [
  { key: 'wellness' as const, label: 'Wellness', Icon: Heart },
  { key: 'family' as const, label: 'Family', Icon: Baby },
  { key: 'food' as const, label: 'Food', Icon: Coffee },
  { key: 'daily' as const, label: 'Daily Life', Icon: MapPin },
];

const EMPTY_CATEGORY_MESSAGES: Record<string, string> = {
  wellness: "No fitness or wellness spots found nearby — but that doesn't mean they aren't there. Check locally on arrival.",
  family: 'No family-specific activities found nearby. The local area may still have plenty to discover with kids.',
  food: "No cafes or restaurants mapped nearby — unusual! There's almost certainly somewhere great around the corner.",
  daily: 'No pharmacies, banks, or transport stops mapped nearby. We recommend checking Google Maps for essentials.',
};

function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/@${lat},${lng},16z`;
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full h-[200px] bg-slate-200 rounded-xl mb-4" />
      <div className="flex gap-2 mb-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-10 bg-slate-200 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-slate-200 rounded w-3/4" />
              <div className="h-2.5 bg-slate-200 rounded w-1/2" />
            </div>
            <div className="w-12 h-5 bg-slate-200 rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Compass SVG for empty state ───────────────────────────────────────────────
function CompassIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true" className="mx-auto mb-3">
      <circle cx="40" cy="40" r="36" stroke="#d1d5db" strokeWidth="2" fill="#f9fafb" />
      <path d="M40 16 L44 36 L40 32 L36 36 Z" fill="#0d9488" />
      <path d="M40 64 L44 44 L40 48 L36 44 Z" fill="#d1d5db" />
      <text x="40" y="46" textAnchor="middle" fontSize="18" fill="#6b7280" fontWeight="bold">?</text>
    </svg>
  );
}

// ── Place item ────────────────────────────────────────────────────────────────
function PlaceItem({ place, categoryColor }: { place: ScoutPlace; categoryColor?: string }) {
  const Icon = TYPE_ICONS[place.type] || MapPin;
  const label = TYPE_LABELS[place.type] || place.type;

  return (
    <div className="flex items-center gap-3 py-3 px-2 border-b border-[#f1f3f7] last:border-0 hover:bg-[#f8fafc] rounded-lg transition-colors">
      <div className="flex items-center gap-2 flex-shrink-0">
        {categoryColor && (
          <span className={`w-2 h-2 rounded-full ${categoryColor} flex-shrink-0`} aria-hidden="true" />
        )}
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-slate-600" aria-label={label} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1D2B] truncate">{place.name}</p>
        <p className="text-[.68rem] text-[#8E95A9]">{label}</p>
      </div>
      <div className="flex items-center gap-1 text-[.72rem] text-[#5C6378] font-semibold flex-shrink-0">
        <PersonStanding size={12} aria-hidden="true" />
        <span>{place.walk_min} min</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ScoutSidebar({ hotelName, latitude, longitude, onClose }: Props) {
  const [data, setData] = useState<ScoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wellness' | 'family' | 'food' | 'daily'>('food');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const dragStartY = useRef(0);
  const dragDelta = useRef(0);

  // ── Detect mobile ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, radius: 1000 }),
      });
      const json = await res.json();
      setData(json);

      // Auto-select first non-empty tab
      if (json.categories) {
        for (const tab of ['food', 'daily', 'family', 'wellness'] as const) {
          if (json.categories[tab]?.length > 0) {
            setActiveTab(tab);
            break;
          }
        }
      }
    } catch {
      setData({
        hotel: { lat: latitude, lng: longitude },
        radius: 1000,
        quality: 'empty',
        summary: { total: 0, wellness: 0, family: 0, food: 0, daily: 0 },
        categories: { wellness: [], family: [], food: [], daily: [] },
        cached: false,
        fallback: true,
        message: 'Neighbourhood data is temporarily unavailable. Please try again shortly.',
      });
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Focus trap & escape ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }

      // Arrow key tab navigation
      if (data && !data.fallback && data.quality !== 'thin' && data.quality !== 'empty') {
        const tabKeys = TABS.map(t => t.key);
        const idx = tabKeys.indexOf(activeTab);
        if (e.key === 'ArrowRight' && idx < tabKeys.length - 1) {
          e.preventDefault();
          setActiveTab(tabKeys[idx + 1]);
        }
        if (e.key === 'ArrowLeft' && idx > 0) {
          e.preventDefault();
          setActiveTab(tabKeys[idx - 1]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus the sidebar
    sidebarRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, activeTab, data]);

  // ── Mobile drag handlers ──
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    dragDelta.current = e.touches[0].clientY - dragStartY.current;
  };

  const handleTouchEnd = () => {
    if (dragDelta.current < -50) {
      setSheetExpanded(true);
    } else if (dragDelta.current > 80) {
      if (sheetExpanded) setSheetExpanded(false);
      else onClose();
    }
    dragDelta.current = 0;
  };

  // ── Render content ──
  const renderContent = () => {
    if (loading) return <Skeleton />;
    if (!data) return null;

    // Fallback state
    if (data.fallback) {
      return (
        <div className="text-center py-8">
          <CompassIllustration />
          <p className="text-sm text-[#5C6378] mb-4">
            {data.message || 'Neighbourhood data is temporarily unavailable. Please try again in a moment.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={fetchData} className="px-4 py-2 bg-[#0d9488] text-white text-sm font-semibold rounded-xl hover:bg-[#0f766e] transition-colors">
              Retry
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-[#E8ECF4] text-sm font-semibold text-[#5C6378] rounded-xl hover:bg-slate-50 transition-colors">
              Close
            </button>
          </div>
        </div>
      );
    }

    // Empty state
    if (data.quality === 'empty') {
      return (
        <div className="text-center py-8">
          <CompassIllustration />
          <p className="text-sm text-[#1A1D2B] font-semibold mb-1">
            We don't have neighbourhood data for this area yet.
          </p>
          <p className="text-[.78rem] text-[#8E95A9] mb-4">
            You can explore the surroundings on Google Maps.
          </p>
          <a
            href={googleMapsUrl(latitude, longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-[#0d9488] text-white text-sm font-semibold rounded-xl hover:bg-[#0f766e] transition-colors mb-3"
          >
            Open Google Maps
          </a>
          <br />
          <button onClick={onClose} className="px-4 py-2 border border-[#E8ECF4] text-sm font-semibold text-[#5C6378] rounded-xl hover:bg-slate-50 transition-colors">
            Close
          </button>
        </div>
      );
    }

    const mapPlaces = {
      wellness: data.categories.wellness.map(p => ({ lat: p.lat, lng: p.lng, name: p.name })),
      family: data.categories.family.map(p => ({ lat: p.lat, lng: p.lng, name: p.name })),
      food: data.categories.food.map(p => ({ lat: p.lat, lng: p.lng, name: p.name })),
      daily: data.categories.daily.map(p => ({ lat: p.lat, lng: p.lng, name: p.name })),
    };

    // Thin state — combined list
    if (data.quality === 'thin') {
      const allPlaces = Object.entries(data.categories).flatMap(([cat, places]) =>
        places.map(p => ({ ...p, category: cat }))
      ).sort((a, b) => a.distance_m - b.distance_m);

      return (
        <>
          <ScoutMap hotelName={hotelName} lat={latitude} lng={longitude} places={mapPlaces} height={isMobile ? 180 : 200} />
          <div className="mt-4">
            <p className="text-sm text-[#5C6378] font-semibold mb-3">We found a few spots near this hotel.</p>
            <div>
              {allPlaces.map((p, i) => (
                <PlaceItem key={`${p.name}-${i}`} place={p} categoryColor={CATEGORY_COLORS[p.category]} />
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[#f1f3f7]">
              <p className="text-[.72rem] text-[#8E95A9] mb-2">
                This area has limited coverage in our database. We recommend checking Google Maps for a fuller picture.
              </p>
              <a
                href={googleMapsUrl(latitude, longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[.75rem] text-[#0d9488] font-semibold hover:underline"
              >
                Open Google Maps →
              </a>
            </div>
          </div>
        </>
      );
    }

    // Rich / moderate — tabbed view
    const activeItems = data.categories[activeTab];

    return (
      <>
        <ScoutMap hotelName={hotelName} lat={latitude} lng={longitude} places={mapPlaces} height={isMobile ? 180 : 200} />

        {/* Tabs */}
        <div className="flex mt-4 border-b border-[#f1f3f7]" role="tablist" aria-label="Neighbourhood categories">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              aria-label={label}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[.68rem] font-semibold transition-colors border-b-2 ${
                activeTab === key
                  ? 'text-[#0d9488] border-[#0d9488]'
                  : 'text-[#8E95A9] border-transparent hover:text-[#5C6378]'
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="mt-2" role="tabpanel" aria-label={`${activeTab} results`}>
          {activeItems.length > 0 ? (
            activeItems.map((p, i) => <PlaceItem key={`${p.name}-${i}`} place={p} />)
          ) : (
            <p className="text-[.78rem] text-[#8E95A9] py-6 text-center px-4">
              {EMPTY_CATEGORY_MESSAGES[activeTab]}
            </p>
          )}
        </div>

        {data.quality === 'moderate' && (
          <p className="text-[.68rem] text-[#8E95A9] text-center mt-4 pt-3 border-t border-[#f1f3f7]">
            Showing available neighbourhood data. Popular destinations have richer coverage.
          </p>
        )}
      </>
    );
  };

  // ── Desktop sidebar ──
  if (!isMobile) {
    return (
      <>
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/20 z-[300] animate-[fadeIn_200ms_ease-out]"
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Sidebar */}
        <div
          ref={sidebarRef}
          tabIndex={-1}
          role="dialog"
          aria-label={`Neighbourhood scout for ${hotelName}`}
          className="fixed top-0 right-0 h-screen w-[420px] bg-white z-[301] overflow-y-auto outline-none animate-[slideInRight_300ms_ease-out]"
          style={{
            boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
            borderTopLeftRadius: '12px',
            borderBottomLeftRadius: '12px',
          }}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b border-[#f1f3f7]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-[1rem] text-[#1A1D2B]">{hotelName}</h2>
                <p className="text-[.72rem] text-[#8E95A9]">What&apos;s nearby within a 12 min walk</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close sidebar"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={18} className="text-[#5C6378]" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5">
            {renderContent()}
          </div>
        </div>
      </>
    );
  }

  // ── Mobile bottom sheet ──
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[300] animate-[fadeIn_200ms_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Bottom sheet */}
      <div
        ref={sidebarRef}
        tabIndex={-1}
        role="dialog"
        aria-label={`Neighbourhood scout for ${hotelName}`}
        className="fixed bottom-0 left-0 right-0 bg-white z-[301] overflow-y-auto outline-none animate-[slideUp_300ms_ease-out]"
        style={{
          height: sheetExpanded ? '100vh' : '70vh',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
          transition: 'height 300ms ease-out',
        }}
      >
        {/* Grabber */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-[#d1d5db]" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-[#f1f3f7]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-[.95rem] text-[#1A1D2B]">{hotelName}</h2>
              <p className="text-[.68rem] text-[#8E95A9]">What&apos;s nearby within a 12 min walk</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close sidebar"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={18} className="text-[#5C6378]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 pb-10">
          {renderContent()}
        </div>
      </div>
    </>
  );
}
