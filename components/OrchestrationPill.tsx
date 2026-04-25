'use client';

interface OrchestrationPillProps {
  onClick: () => void;
  unseenCount?: number;
}

export function OrchestrationPill({ onClick, unseenCount = 0 }: OrchestrationPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open orchestration view${unseenCount > 0 ? `, ${unseenCount} new events` : ''}`}
      className="
        fixed bottom-4 right-4 z-40
        w-12 h-12 rounded-full
        bg-zinc-900/80 backdrop-blur-sm
        border border-cyan-500/40
        flex items-center justify-center
        shadow-lg shadow-cyan-500/10
        hover:border-cyan-400/60 hover:shadow-cyan-400/20
        active:scale-95
        transition-all duration-200
        cursor-pointer
      "
      style={{ minWidth: 48, minHeight: 48 }}
    >
      <span className="text-lg" aria-hidden="true">
        {'\uD83D\uDD2C'}
      </span>

      {/* Unseen event badge */}
      {unseenCount > 0 && (
        <span
          className="
            absolute -top-1 -right-1
            min-w-[18px] h-[18px] px-1
            bg-red-600 text-white
            text-[10px] font-bold
            rounded-full
            flex items-center justify-center
            animate-pulse
          "
          aria-hidden="true"
        >
          {unseenCount > 99 ? '99+' : unseenCount}
        </span>
      )}

      {/* Subtle pulse ring when there are unseen events */}
      {unseenCount > 0 && (
        <span
          className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping"
          aria-hidden="true"
          style={{ animationDuration: '2s' }}
        />
      )}
    </button>
  );
}
