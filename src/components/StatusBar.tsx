interface StatusBarProps {
  activeCount: number;
  totalCount: number;
}

export function StatusBar({ activeCount, totalCount }: StatusBarProps) {
  return (
    <div className="border-t border-slate-700 bg-slate-900 px-6 py-3 text-sm text-slate-400">
      {totalCount === 0 ? (
        "No connections yet"
      ) : (
        <>
          <span className="text-green-500 font-medium">{activeCount}</span> of{" "}
          <span className="font-medium">{totalCount}</span> tunnel
          {totalCount !== 1 ? "s" : ""} active
        </>
      )}
    </div>
  );
}
