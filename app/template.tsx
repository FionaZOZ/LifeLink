'use client';
import * as React from 'react';

// App Router re-mounts `template.tsx` on every navigation (unlike `layout.tsx`
// which persists), so wrapping the page in a fresh element here is enough to
// trigger a CSS keyframe on each route change. The wrapper is absolutely
// positioned to fill `.ll-stage-safe` so pages that rely on `width/height:
// 100%` (Screen, scroll containers) keep working.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="ll-page-enter">{children}</div>;
}
