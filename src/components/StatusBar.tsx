interface StatusBarProps {
  activeCount: number;
  totalCount: number;
}

export function StatusBar({ activeCount, totalCount }: StatusBarProps) {
  return (
    <div className="border-t border-border bg-rail px-5 py-1.5 text-[11px] text-text-muted flex items-center gap-3">
      {totalCount === 0 ? (
        "No connections"
      ) : (
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${activeCount > 0 ? "bg-status-connected" : "bg-status-disconnected"}`}
          />
          <span>
            <span className={activeCount > 0 ? "text-status-connected font-medium" : "font-medium"}>
              {activeCount}
            </span>
            {" / "}
            {totalCount} tunnel{totalCount !== 1 ? "s" : ""} active
          </span>
        </div>
      )}
    </div>
  );
}
