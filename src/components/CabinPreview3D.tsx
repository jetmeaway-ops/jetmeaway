'use client';

import { useState } from 'react';
import Cabin3DProcedural from './Cabin3DProcedural';
import type { Seat3DPosition } from '@/lib/cabin3d-mapping';

type CabinPreview3DProps = {
  seats: Seat3DPosition[];
  selectedDesignator: string | null;
  onSeatClick: (designator: string) => void;
  className?: string;
};

export default function CabinPreview3D({
  seats,
  selectedDesignator,
  onSeatClick,
  className = '',
}: CabinPreview3DProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-[#E8ECF4] bg-[#0a0d14] ${className}`}
      style={{ height: collapsed ? 44 : undefined }}
    >
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <span className="text-[.58rem] font-black uppercase tracking-[2px] text-white/85">
          Cabin preview
        </span>
        {!collapsed && (
          <span className="text-[.6rem] text-white/55 font-semibold">
            tap a seat · drag to rotate
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Show 3D cabin preview' : 'Hide 3D cabin preview'}
        aria-expanded={!collapsed}
        className="absolute top-1.5 right-2 z-10 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/85 flex items-center justify-center transition-colors backdrop-blur-sm"
      >
        <i className={`fa-solid ${collapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-[.65rem]`} aria-hidden />
      </button>
      {!collapsed && (
        <div className="h-[240px] md:h-[320px] w-full">
          <Cabin3DProcedural
            seats={seats}
            selectedDesignator={selectedDesignator}
            onSeatClick={onSeatClick}
            background="#0a0d14"
            enableControls
            cameraPosition={[0, 4, 14]}
            fov={18}
            boundsMargin={0.42}
          />
        </div>
      )}
    </div>
  );
}
