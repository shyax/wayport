import { useEffect, useState } from "react";
import { Key, Copy, Plus, Check, Loader2 } from "lucide-react";
import * as api from "../lib/api";
import type { SshKeyInfo } from "../lib/api";

export function SSHKeyManager() {
  const [keys, setKeys] = useState<SshKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Generate form state
  const [genName, setGenName] = useState("");
  const [genType, setGenType] = useState<"ed25519" | "rsa" | "ecdsa">("ed25519");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSuccess, setGenSuccess] = useState<string | null>(null);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const result = await api.listSshKeys();
      setKeys(result);
    } catch (e) {
      console.error("Failed to list SSH keys:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCopyPublicKey = async (key: SshKeyInfo) => {
    try {
      const content = await api.getPublicKey(key.name);
      await navigator.clipboard.writeText(content.trim());
      setCopiedKey(key.name);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      console.error("Failed to copy public key:", e);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = genName.trim();
    if (!name) return;

    setGenerating(true);
    setGenError(null);
    setGenSuccess(null);

    try {
      const path = await api.generateSshKey(name, genType);
      setGenSuccess(`Key generated at ${path}`);
      setGenName("");
      await loadKeys();
    } catch (e) {
      setGenError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors duration-150";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Key list */}
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
          SSH Keys (~/.ssh)
        </h3>

        {loading ? (
          <div className="flex items-center gap-2 text-text-muted text-sm py-4">
            <Loader2 size={14} className="animate-spin" />
            Loading keys...
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Key size={24} className="text-text-muted" />
            <p className="text-sm text-text-muted">No SSH keys found in ~/.ssh</p>
            <p className="text-xs text-text-muted">Generate a key below to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {keys.map((key) => (
              <div
                key={key.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-elevated border border-border hover:border-border transition-colors group"
              >
                <Key size={14} className="text-text-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary font-medium truncate">{key.name}</p>
                  <p className="text-[11px] text-text-muted font-mono truncate">{key.path}</p>
                </div>
                <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent border border-accent/20">
                  {key.key_type}
                </span>
                {key.has_public && (
                  <button
                    onClick={() => handleCopyPublicKey(key)}
                    title="Copy public key to clipboard"
                    className="focus-ring flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-text-muted hover:text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors duration-150"
                  >
                    {copiedKey === key.name ? (
                      <>
                        <Check size={12} className="text-status-connected" />
                        <span className="text-status-connected">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Generate new key */}
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Generate New Key
        </h3>

        <form onSubmit={handleGenerate} className="p-4 rounded-xl bg-bg-elevated border border-border space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Key Name
              </label>
              <input
                type="text"
                required
                value={genName}
                onChange={(e) => setGenName(e.target.value)}
                placeholder="e.g. id_ed25519_work"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Key Type
              </label>
              <select
                value={genType}
                onChange={(e) => setGenType(e.target.value as "ed25519" | "rsa" | "ecdsa")}
                className={inputClass}
              >
                <option value="ed25519">ED25519 (recommended)</option>
                <option value="rsa">RSA</option>
                <option value="ecdsa">ECDSA</option>
              </select>
            </div>
          </div>

          {genError && (
            <p className="text-[12px] text-status-error bg-status-error/10 border border-status-error/20 px-3 py-2 rounded-lg">
              {genError}
            </p>
          )}

          {genSuccess && (
            <div className="flex items-center gap-2 text-[12px] text-status-connected bg-status-connected/10 border border-status-connected/20 px-3 py-2 rounded-lg">
              <Check size={13} />
              {genSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={generating || !genName.trim()}
            className="focus-ring flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-bg rounded-lg text-sm font-medium cursor-pointer transition-colors duration-150"
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            {generating ? "Generating..." : "Generate Key"}
          </button>
        </form>
      </section>
    </div>
  );
}
