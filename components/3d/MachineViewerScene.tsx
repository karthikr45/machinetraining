'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { HotspotManager } from './HotspotManager';

const MachineViewer3D = dynamic(() => import('./MachineViewer3D'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-900">
      <Loader2 className="h-8 w-8 animate-spin text-white/70" />
    </div>
  ),
});

export function MachineViewerScene() {
  const [active, setActive] = React.useState<string | null>(null);

  return (
    <div className="relative h-[70vh] min-h-[420px] w-full overflow-hidden rounded-xl border bg-slate-900">
      <MachineViewer3D activeHotspot={active} />
      <HotspotManager active={active} onSelect={setActive} />
    </div>
  );
}
