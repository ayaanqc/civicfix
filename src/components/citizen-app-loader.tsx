"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

const CitizenApp = dynamic(() => import("./citizen-app"), {
  ssr: false,
  loading: () => <Splash />,
});

export default function CitizenAppLoader() {
  return <CitizenApp />;
}

/** Full-viewport boot splash shown while the client bundle loads. */
export function Splash() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-bg-app">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-civic text-white shadow-card">
        <MapPin className="h-7 w-7" strokeWidth={2.2} />
      </div>
      <div className="text-lg font-semibold tracking-tight text-ink">
        CivicFix
      </div>
      <div className="flex items-center gap-2 text-xs font-medium text-ink-3">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-civic" />
        Loading field map…
      </div>
    </div>
  );
}
