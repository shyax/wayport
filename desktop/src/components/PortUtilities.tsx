import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Skull, Activity, AlertTriangle, Plus, X, Trash2, Cable } from "lucide-react";
import * as api from "../lib/api";
import { useProfileStore } from "../stores/profileStore";
import type { PortInfo, PortMonitorUpdate } from "../lib/types";

const COMMON_PORTS = [
  { port: 3000, label: "Dev" },
  { port: 5432, label: "Postgres" },
  { port: 3306, label: "MySQL" },
  { port: 6379, label: "Redis" },
  { port: 8080, label: "HTTP" },
  { port: 27017, label: "Mongo" },
];

type Tab = "scan" | "kill" | "monitor";

export function PortUtilities() {
  const [activeTab, setActiveTab] = useState<Tab>("scan");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex gap-1 bg-surface p-1 rounded-lg border border-border mb-6">
        {([
          { id: "scan" as Tab, label: "Scan", icon: Search },
          { id: "kill" as Tab, label: "Kill Port", icon: Skull },
          { id: "monitor" as Tab, label: "Monitor", icon: Activity },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`focus-ring flex-1 py-2 px-3 rounded-md text-sm font-medium cursor-pointer transition-colors duration-150 flex items-center justify-center gap-2 ${
              activeTab === id
                ? "bg-accent text-white"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "scan" && <ScanPanel />}
      {activeTab === "kill" && <KillPanel />}
      {activeTab === "monitor" && <MonitorPanel />}
    </div>
  );
}

// --- Shared input class ---
const inputClass =
  "px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors duration-150";

// --- Port tag input ---

function PortTagInput({
  ports,
  onAdd,
  onRemove,
  placeholder,
  disabled,
}: {
  ports: number[];
  onAdd: (port: number) => void;
  onRemove: (port: number) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addPort = () => {
    const raw = input.trim();
    if (!raw) return;

    // Support comma-separated and space-separated
    const parts = raw.split(/[\s,]+/);
    for (const part of parts) {
      const p = parseInt(part);
      if (p >= 1 && p <= 65535 && !ports.includes(p)) {
        onAdd(p);
      }
    }
    setInput("");
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 min-h-[38px] px-2 py-1.5 bg-surface border border-border rounded-lg transition-colors duration-150 focus-within:border-accent ${disabled ? "opacity-50" : ""}`}
      onClick={() => inputRef.current?.focus()}
    >
      {ports.map((p) => (
        <span
          key={p}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 text-accent text-xs font-mono rounded-md border border-accent/20"
        >
          {p}
          {!disabled && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(p); }}
              className="hover:text-status-error cursor-pointer transition-colors"
            >
              <X size={10} />
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "," || e.key === " ") {
            e.preventDefault();
            addPort();
          }
          if (e.key === "Backspace" && !input && ports.length > 0) {
            onRemove(ports[ports.length - 1]);
          }
        }}
        onBlur={addPort}
        placeholder={ports.length === 0 ? (placeholder ?? "Type port numbers...") : ""}
        disabled={disabled}
        className="flex-1 min-w-[80px] bg-transparent text-text-primary text-sm placeholder-text-muted outline-none disabled:cursor-not-allowed"
      />
    </div>
  );
}

// --- Scan Panel ---

function QuickPortButtons({ onAdd, activePorts }: { onAdd: (port: number) => void; activePorts: number[] }) {
  const { profiles, tunnelStates } = useProfileStore();
  const tunnelPorts = profiles
    .filter((p) => tunnelStates[p.id]?.status === "connected")
    .map((p) => p.local_port);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] text-text-muted mr-1">Quick:</span>
      {COMMON_PORTS.map(({ port, label }) => (
        <button
          key={port}
          onClick={() => onAdd(port)}
          disabled={activePorts.includes(port)}
          className="text-[11px] px-2 py-0.5 rounded-md bg-surface border border-border text-text-secondary hover:text-accent hover:border-accent/30 disabled:opacity-30 cursor-pointer transition-colors"
        >
          {label}
        </button>
      ))}
      {tunnelPorts.length > 0 && (
        <button
          onClick={() => tunnelPorts.forEach((p) => onAdd(p))}
          className="text-[11px] px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 cursor-pointer transition-colors flex items-center gap-1"
        >
          <Cable size={10} />
          My Tunnels ({tunnelPorts.length})
        </button>
      )}
    </div>
  );
}

function ScanPanel() {
  const [ports, setPorts] = useState<number[]>([]);
  const [results, setResults] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRange, setIsRange] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isRange) {
        const start = parseInt(rangeStart);
        const end = parseInt(rangeEnd);
        if (!start || !end || start < 1 || end > 65535 || start > end) {
          setError("Invalid range");
          return;
        }
        const data = await api.scanPortRange(start, end);
        setResults(data);
      } else {
        if (ports.length === 0) return;
        const allResults: PortInfo[] = [];
        for (const p of ports) {
          const data = await api.scanPort(p);
          allResults.push(...data);
        }
        setResults(allResults);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const scannedLabel = isRange
    ? `${rangeStart}-${rangeEnd}`
    : ports.join(", ");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <label className="flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={isRange}
            onChange={(e) => setIsRange(e.target.checked)}
            className="w-3.5 h-3.5 accent-accent cursor-pointer"
          />
          Range mode
        </label>
      </div>

      {isRange ? (
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">Start Port</label>
            <input
              type="number"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              placeholder="8080"
              className={`w-28 ${inputClass}`}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted mb-1">End Port</label>
            <input
              type="number"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              placeholder="8090"
              className={`w-28 ${inputClass}`}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
            />
          </div>
          <button
            onClick={handleScan}
            disabled={loading}
            className="focus-ring px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
          >
            {loading ? "Scanning..." : "Scan"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-[11px] text-text-muted">
            Ports <span className="text-text-muted/60">(comma or space separated)</span>
          </label>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <PortTagInput
                ports={ports}
                onAdd={(p) => setPorts((prev) => [...prev, p])}
                onRemove={(p) => setPorts((prev) => prev.filter((x) => x !== p))}
                placeholder="e.g. 3000, 5432, 8080"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={loading || ports.length === 0}
              className="focus-ring px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150 flex-shrink-0"
            >
              {loading ? "Scanning..." : "Scan"}
            </button>
          </div>
        </div>
      )}

      {!isRange && (
        <QuickPortButtons
          onAdd={(p) => !ports.includes(p) && setPorts((prev) => [...prev, p])}
          activePorts={ports}
        />
      )}

      {error && <p className="text-status-error text-sm">{error}</p>}

      {results.length > 0 && <PortTable entries={results} />}
      {results.length === 0 && !loading && (ports.length > 0 || isRange) && !error && (
        <p className="text-text-muted text-sm">
          No processes found on {isRange ? `ports ${scannedLabel}` : `port${ports.length > 1 ? "s" : ""} ${scannedLabel}`}
        </p>
      )}
    </div>
  );
}

// --- Kill Panel ---

function KillPanel() {
  const [ports, setPorts] = useState<number[]>([]);
  const [results, setResults] = useState<{ port: number; message: string }[]>([]);
  const [preview, setPreview] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handlePreview = async () => {
    if (ports.length === 0) return;
    setLoading(true);
    setResults([]);
    try {
      const allInfo: PortInfo[] = [];
      for (const p of ports) {
        const data = await api.scanPort(p);
        allInfo.push(...data);
      }
      setPreview(allInfo);
      if (allInfo.length > 0) {
        setConfirming(true);
      } else {
        setResults(ports.map((p) => ({ port: p, message: `No processes found on port ${p}` })));
      }
    } catch (e) {
      setResults([{ port: 0, message: String(e) }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKill = async () => {
    setLoading(true);
    try {
      const killResults: { port: number; message: string }[] = [];
      for (const p of ports) {
        const msg = await api.killPort(p);
        killResults.push({ port: p, message: msg });
      }
      setResults(killResults);
      setConfirming(false);
      setPreview([]);
    } catch (e) {
      setResults([{ port: 0, message: String(e) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-[11px] text-text-muted">
          Ports to kill <span className="text-text-muted/60">(comma or space separated)</span>
        </label>
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <PortTagInput
              ports={ports}
              onAdd={(p) => {
                setPorts((prev) => [...prev, p]);
                setConfirming(false);
                setPreview([]);
                setResults([]);
              }}
              onRemove={(p) => {
                setPorts((prev) => prev.filter((x) => x !== p));
                setConfirming(false);
                setPreview([]);
                setResults([]);
              }}
              placeholder="e.g. 3000, 8080"
            />
          </div>
          {!confirming ? (
            <button
              onClick={handlePreview}
              disabled={loading || ports.length === 0}
              className="focus-ring px-4 py-2 bg-status-error/15 hover:bg-status-error/25 border border-status-error/20 text-status-error disabled:opacity-50 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150 flex-shrink-0"
            >
              {loading ? "Checking..." : "Kill Port"}
            </button>
          ) : (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleKill}
                disabled={loading}
                className="focus-ring px-4 py-2 bg-status-error/15 hover:bg-status-error/25 border border-status-error/20 text-status-error disabled:opacity-50 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150 flex items-center gap-2"
              >
                <AlertTriangle size={14} />
                Confirm Kill
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  setPreview([]);
                }}
                className="focus-ring px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-text-secondary rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {confirming && preview.length > 0 && (
        <div>
          <p className="text-status-reconnecting text-sm mb-2">
            These processes will be killed:
          </p>
          <PortTable entries={preview} />
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((r, i) => (
            <p
              key={i}
              className={`text-sm ${r.message.includes("Killed") ? "text-status-connected" : "text-text-muted"}`}
            >
              {r.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Monitor Panel ---

interface MonitorEntry {
  port: number;
  connections: PortInfo[];
}

function MonitorPanel() {
  const [portInput, setPortInput] = useState("");
  const [monitors, setMonitors] = useState<MonitorEntry[]>([]);
  const monitorsRef = useRef<MonitorEntry[]>([]);

  // Keep ref in sync for the event handler
  useEffect(() => {
    monitorsRef.current = monitors;
  }, [monitors]);

  const addPort = useCallback(async () => {
    const raw = portInput.trim();
    if (!raw) return;

    const parts = raw.split(/[\s,]+/);
    for (const part of parts) {
      const p = parseInt(part);
      if (p >= 1 && p <= 65535 && !monitorsRef.current.some((m) => m.port === p)) {
        await api.startPortMonitor(p);
        setMonitors((prev) => [...prev, { port: p, connections: [] }]);
      }
    }
    setPortInput("");
  }, [portInput]);

  const removePort = useCallback(async (port: number) => {
    await api.stopPortMonitor(port);
    setMonitors((prev) => prev.filter((m) => m.port !== port));
  }, []);

  const removeAll = useCallback(async () => {
    for (const m of monitorsRef.current) {
      await api.stopPortMonitor(m.port);
    }
    setMonitors([]);
  }, []);

  // Listen for monitor updates
  useEffect(() => {
    const unlisten = api.onPortMonitorUpdate((data: PortMonitorUpdate) => {
      setMonitors((prev) =>
        prev.map((m) =>
          m.port === data.port ? { ...m, connections: data.connections } : m
        )
      );
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const m of monitorsRef.current) {
        api.stopPortMonitor(m.port).catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-[11px] text-text-muted mb-1">
            Add ports to monitor <span className="text-text-muted/60">(comma or space separated)</span>
          </label>
          <input
            type="text"
            value={portInput}
            onChange={(e) => setPortInput(e.target.value)}
            placeholder="e.g. 3000, 5432, 8080"
            className={`w-full ${inputClass}`}
            onKeyDown={(e) => e.key === "Enter" && addPort()}
          />
        </div>
        <button
          onClick={addPort}
          className="focus-ring px-4 py-2 bg-status-connected/15 hover:bg-status-connected/25 border border-status-connected/20 text-status-connected rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150 flex items-center gap-1.5 flex-shrink-0"
        >
          <Plus size={14} />
          Add
        </button>
        {monitors.length > 1 && (
          <button
            onClick={removeAll}
            className="focus-ring px-4 py-2 bg-status-error/15 hover:bg-status-error/25 border border-status-error/20 text-status-error rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150 flex items-center gap-1.5 flex-shrink-0"
          >
            <Trash2 size={14} />
            Stop All
          </button>
        )}
      </div>

      {monitors.length === 0 && (
        <p className="text-text-muted text-sm">
          No ports being monitored. Add ports above to start watching.
        </p>
      )}

      {monitors.map((m) => (
        <div key={m.port} className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-surface">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-status-connected rounded-full animate-status-pulse" />
              <span className="text-sm font-mono font-medium text-text-primary">
                Port {m.port}
              </span>
              <span className="text-[11px] text-text-muted">
                {m.connections.length} connection{m.connections.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => removePort(m.port)}
              className="focus-ring p-1 rounded-md text-text-muted hover:text-status-error cursor-pointer transition-colors duration-150"
              title={`Stop monitoring port ${m.port}`}
            >
              <X size={14} />
            </button>
          </div>
          {m.connections.length > 0 ? (
            <PortTable entries={m.connections} compact />
          ) : (
            <div className="px-3 py-3 text-text-muted text-xs">
              No connections yet
            </div>
          )}
        </div>
      ))}

      {monitors.length > 0 && (
        <p className="text-[11px] text-text-muted">
          Refreshing every 2s
        </p>
      )}
    </div>
  );
}

// --- Shared Table ---

function PortTable({ entries, compact }: { entries: PortInfo[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted bg-surface text-[11px] uppercase tracking-wider">
            <th className="px-3 py-2 font-medium">PID</th>
            <th className="px-3 py-2 font-medium">Process</th>
            <th className="px-3 py-2 font-medium">Port</th>
            <th className="px-3 py-2 font-medium">Proto</th>
            <th className="px-3 py-2 font-medium">State</th>
            <th className="px-3 py-2 font-medium">Local Address</th>
            <th className="px-3 py-2 font-medium">Remote Address</th>
          </tr>
        </thead>
        <tbody className="font-mono text-xs">
          {entries.map((entry, i) => (
            <tr
              key={i}
              className={`border-t border-border hover:bg-surface-hover transition-colors duration-100 ${compact ? "" : ""}`}
            >
              <td className="px-3 py-1.5 text-text-secondary">
                {entry.pid ?? "-"}
              </td>
              <td className="px-3 py-1.5 text-accent">
                {entry.process_name ?? "-"}
              </td>
              <td className="px-3 py-1.5 text-text-secondary">{entry.port}</td>
              <td className="px-3 py-1.5 text-text-muted">
                {entry.protocol ?? "-"}
              </td>
              <td className="px-3 py-1.5">
                <span
                  className={
                    entry.state === "LISTEN"
                      ? "text-status-connected"
                      : entry.state === "ESTABLISHED"
                        ? "text-accent"
                        : "text-text-muted"
                  }
                >
                  {entry.state}
                </span>
              </td>
              <td className="px-3 py-1.5 text-text-secondary">
                {entry.local_addr}
              </td>
              <td className="px-3 py-1.5 text-text-muted">
                {entry.remote_addr ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
