import { useState, useEffect, useCallback } from "react";
import { Search, Skull, Activity, AlertTriangle } from "lucide-react";
import * as api from "../lib/api";
import type { PortInfo, PortMonitorUpdate } from "../lib/types";

type Tab = "scan" | "kill" | "monitor";

export function PortUtilities() {
  const [activeTab, setActiveTab] = useState<Tab>("scan");

  return (
    <div className="max-w-3xl">
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

// --- Scan Panel ---

function ScanPanel() {
  const [port, setPort] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [results, setResults] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRange, setIsRange] = useState(false);

  const handleScan = async () => {
    const p = parseInt(port);
    if (!p || p < 1 || p > 65535) return;
    setLoading(true);
    setError(null);
    try {
      if (isRange && rangeEnd) {
        const end = parseInt(rangeEnd);
        if (end < p || end > 65535) {
          setError("Invalid range");
          return;
        }
        const data = await api.scanPortRange(p, end);
        setResults(data);
      } else {
        const data = await api.scanPort(p);
        setResults(data);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-[11px] text-text-muted mb-1">
            {isRange ? "Start Port" : "Port"}
          </label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="8080"
            className={`w-28 ${inputClass}`}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
          />
        </div>
        {isRange && (
          <div>
            <label className="block text-[11px] text-text-muted mb-1">
              End Port
            </label>
            <input
              type="number"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              placeholder="8090"
              className={`w-28 ${inputClass}`}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
            />
          </div>
        )}
        <button
          onClick={handleScan}
          disabled={loading}
          className="focus-ring px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
        >
          {loading ? "Scanning..." : "Scan"}
        </button>
        <label className="flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer ml-2">
          <input
            type="checkbox"
            checked={isRange}
            onChange={(e) => setIsRange(e.target.checked)}
            className="w-3.5 h-3.5 accent-accent cursor-pointer"
          />
          Range
        </label>
      </div>

      {error && <p className="text-status-error text-sm">{error}</p>}

      {results.length > 0 && <PortTable entries={results} />}
      {results.length === 0 && !loading && port && !error && (
        <p className="text-text-muted text-sm">
          No processes found on port {port}
          {isRange && rangeEnd ? `-${rangeEnd}` : ""}
        </p>
      )}
    </div>
  );
}

// --- Kill Panel ---

function KillPanel() {
  const [port, setPort] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [preview, setPreview] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handlePreview = async () => {
    const p = parseInt(port);
    if (!p || p < 1 || p > 65535) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await api.scanPort(p);
      setPreview(data);
      if (data.length > 0) {
        setConfirming(true);
      } else {
        setResult(`No processes found on port ${p}`);
      }
    } catch (e) {
      setResult(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleKill = async () => {
    const p = parseInt(port);
    if (!p) return;
    setLoading(true);
    try {
      const msg = await api.killPort(p);
      setResult(msg);
      setConfirming(false);
      setPreview([]);
    } catch (e) {
      setResult(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-[11px] text-text-muted mb-1">Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => {
              setPort(e.target.value);
              setConfirming(false);
              setPreview([]);
              setResult(null);
            }}
            placeholder="3000"
            className={`w-28 ${inputClass}`}
            onKeyDown={(e) => e.key === "Enter" && handlePreview()}
          />
        </div>
        {!confirming ? (
          <button
            onClick={handlePreview}
            disabled={loading}
            className="focus-ring px-4 py-2 bg-status-error/15 hover:bg-status-error/25 border border-status-error/20 text-status-error disabled:opacity-50 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
          >
            {loading ? "Checking..." : "Kill Port"}
          </button>
        ) : (
          <div className="flex gap-2">
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

      {confirming && preview.length > 0 && (
        <div>
          <p className="text-status-reconnecting text-sm mb-2">
            These processes will be killed:
          </p>
          <PortTable entries={preview} />
        </div>
      )}

      {result && (
        <p
          className={`text-sm ${result.includes("Killed") ? "text-status-connected" : "text-text-muted"}`}
        >
          {result}
        </p>
      )}
    </div>
  );
}

// --- Monitor Panel ---

function MonitorPanel() {
  const [port, setPort] = useState("");
  const [monitoring, setMonitoring] = useState(false);
  const [connections, setConnections] = useState<PortInfo[]>([]);

  const handleStart = useCallback(async () => {
    const p = parseInt(port);
    if (!p || p < 1 || p > 65535) return;
    await api.startPortMonitor(p);
    setMonitoring(true);
    setConnections([]);
  }, [port]);

  const handleStop = useCallback(async () => {
    const p = parseInt(port);
    if (p) {
      await api.stopPortMonitor(p);
    }
    setMonitoring(false);
  }, [port]);

  useEffect(() => {
    if (!monitoring) return;

    const unlisten = api.onPortMonitorUpdate((data: PortMonitorUpdate) => {
      if (data.port === parseInt(port)) {
        setConnections(data.connections);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [monitoring, port]);

  useEffect(() => {
    return () => {
      if (monitoring && port) {
        api.stopPortMonitor(parseInt(port)).catch(() => {});
      }
    };
  }, [monitoring, port]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-[11px] text-text-muted mb-1">Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="5432"
            disabled={monitoring}
            className={`w-28 ${inputClass} disabled:opacity-50`}
            onKeyDown={(e) =>
              e.key === "Enter" && !monitoring && handleStart()
            }
          />
        </div>
        {monitoring ? (
          <button
            onClick={handleStop}
            className="focus-ring px-4 py-2 bg-status-error/15 hover:bg-status-error/25 border border-status-error/20 text-status-error rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="focus-ring px-4 py-2 bg-status-connected/15 hover:bg-status-connected/25 border border-status-connected/20 text-status-connected rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
          >
            Start Monitoring
          </button>
        )}
        {monitoring && (
          <span className="text-[11px] text-status-connected flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-status-connected rounded-full animate-status-pulse" />
            Live — refreshing every 2s
          </span>
        )}
      </div>

      {monitoring && connections.length > 0 && (
        <PortTable entries={connections} />
      )}
      {monitoring && connections.length === 0 && (
        <p className="text-text-muted text-sm">
          No connections on port {port} yet
        </p>
      )}
    </div>
  );
}

// --- Shared Table ---

function PortTable({ entries }: { entries: PortInfo[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted bg-surface text-[11px] uppercase tracking-wider">
            <th className="px-3 py-2.5 font-medium">PID</th>
            <th className="px-3 py-2.5 font-medium">Process</th>
            <th className="px-3 py-2.5 font-medium">Port</th>
            <th className="px-3 py-2.5 font-medium">Proto</th>
            <th className="px-3 py-2.5 font-medium">State</th>
            <th className="px-3 py-2.5 font-medium">Local Address</th>
            <th className="px-3 py-2.5 font-medium">Remote Address</th>
          </tr>
        </thead>
        <tbody className="font-mono text-xs">
          {entries.map((entry, i) => (
            <tr
              key={i}
              className="border-t border-border hover:bg-surface-hover transition-colors duration-100"
            >
              <td className="px-3 py-2 text-text-secondary">
                {entry.pid ?? "-"}
              </td>
              <td className="px-3 py-2 text-accent">
                {entry.process_name ?? "-"}
              </td>
              <td className="px-3 py-2 text-text-secondary">{entry.port}</td>
              <td className="px-3 py-2 text-text-muted">
                {entry.protocol ?? "-"}
              </td>
              <td className="px-3 py-2">
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
              <td className="px-3 py-2 text-text-secondary">
                {entry.local_addr}
              </td>
              <td className="px-3 py-2 text-text-muted">
                {entry.remote_addr ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
