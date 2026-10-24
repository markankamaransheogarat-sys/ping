import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { getOrCreateWallet, fetchBalance, fundTestnetWallet, createDropLink, claimDrop } from "./stellar";
import { getTelegramWebApp } from "./telegram";
import { Zap, Send, Users, ArrowLeft, RefreshCw, CheckCircle, Copy } from "lucide-react";

type Screen = "home" | "drop" | "split" | "claim";

interface SplitItem {
  id: number;
  title: string;
  goal: number;
  share: number;
  current: number;
  organizer: string;
  deadline: string;
  participants: string[];
}

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [wallet, setWallet] = useState<{ publicKey: string; secretKey: string } | null>(null);
  const [balances, setBalances] = useState<{ xlm: string; usdc: string }>({ xlm: "0", usdc: "0" });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Drop State
  const [dropAmount, setDropAmount] = useState("5");
  const [dropGeneratedUrl, setDropGeneratedUrl] = useState("");
  const [claimDropId, setClaimDropId] = useState("");
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  // Split State
  const [splits, setSplits] = useState<SplitItem[]>([
    {
      id: 1,
      title: "🍕 Pizza party in Berlin",
      goal: 60,
      share: 15,
      current: 45,
      organizer: "Alex",
      deadline: "in 4 hours",
      participants: ["Alex", "Maria", "Ivan"],
    },
    {
      id: 2,
      title: "🚕 Taxi to Airport",
      goal: 40,
      share: 20,
      current: 40,
      organizer: "Denis",
      deadline: "Completed",
      participants: ["Denis", "Amir"],
    },
  ]);
  const [splitTitle, setSplitTitle] = useState("");
  const [splitGoal, setSplitGoal] = useState("50");
  const [splitShare, setSplitShare] = useState("10");

  const tg = getTelegramWebApp();

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
    const w = getOrCreateWallet();
    setWallet(w);
    loadBalance(w.publicKey);

    // Deep link parameters check
    const params = new URLSearchParams(window.location.search);
    const dropParam = params.get("drop") || params.get("id");
    if (dropParam) {
      setClaimDropId(dropParam);
      setScreen("claim");
    }
  }, []);

  async function loadBalance(pubKey: string) {
    try {
      setLoading(true);
      const b = await fetchBalance(pubKey);
      setBalances(b);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFaucet() {
    if (!wallet) return;
    setLoading(true);
    await fundTestnetWallet(wallet.publicKey);
    await loadBalance(wallet.publicKey);
    setLoading(false);
  }

  async function handleCreateDrop() {
    if (!wallet) return;
    try {
      setLoading(true);
      const result = await createDropLink({
        senderSecret: wallet.secretKey,
        amount: dropAmount,
      });
      setDropGeneratedUrl(result.claimUrl);
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred("success");
      }
    } catch (err: any) {
      alert("Drop creation error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimDrop() {
    if (!wallet || !claimDropId) return;
    try {
      setLoading(true);
      setClaimStatus("Claiming on Stellar...");
      await claimDrop({
        claimerSecret: wallet.secretKey,
        balanceId: claimDropId,
      });
      setClaimStatus("Successfully claimed! Funds are now in your wallet.");
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred("success");
      }
      await loadBalance(wallet.publicKey);
    } catch (err: any) {
      setClaimStatus("Claim error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateSplit() {
    if (!splitTitle || !splitGoal || !splitShare) return;
    const newSplit: SplitItem = {
      id: splits.length + 1,
      title: splitTitle,
      goal: parseFloat(splitGoal),
      share: parseFloat(splitShare),
      current: parseFloat(splitShare),
      organizer: "You",
      deadline: "in 24 hours",
      participants: ["You"],
    };
    setSplits([newSplit, ...splits]);
    setSplitTitle("");
    setScreen("split");
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred("success");
    }
  }

  function handleContribute(splitId: number) {
    setSplits((prev) =>
      prev.map((s) => {
        if (s.id === splitId && s.current < s.goal) {
          return {
            ...s,
            current: Math.min(s.goal, s.current + s.share),
            participants: [...s.participants, "You"],
          };
        }
        return s;
      })
    );
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred("medium");
    }
  }

  return (
    <div className="container">
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={24} color="#38bdf8" />
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Ping ⚡</h1>
        </div>
        {screen !== "home" && (
          <button className="btn btn-secondary" onClick={() => setScreen("home")} style={{ padding: "8px 12px" }}>
            <ArrowLeft size={16} /> Home
          </button>
        )}
      </header>

      {/* Screen: Home */}
      {screen === "home" && (
        <>
          <div className="card" style={{ textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>
              Stellar Testnet Balance
            </span>
            <div style={{ fontSize: 36, fontWeight: 800, margin: "12px 0", color: "#38bdf8" }}>
              {parseFloat(balances.xlm).toFixed(2)} <span style={{ fontSize: 20 }}>XLM</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Key: {wallet?.publicKey ? `${wallet.publicKey.slice(0, 6)}...${wallet.publicKey.slice(-6)}` : "Loading..."}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="btn btn-secondary"
                disabled={loading}
                onClick={() => wallet && loadBalance(wallet.publicKey)}
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              {parseFloat(balances.xlm) === 0 && (
                <button className="btn btn-primary" disabled={loading} onClick={handleFaucet}>
                  ⚡ Fund Testnet XLM
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button
              className="btn btn-primary"
              style={{ flexDirection: "column", padding: "20px 12px", gap: 10 }}
              onClick={() => setScreen("drop")}
            >
              <Send size={24} />
              <span>🎁 Ping Drop</span>
              <small style={{ fontWeight: 400, opacity: 0.8 }}>Send via chat link</small>
            </button>
            <button
              className="btn btn-secondary"
              style={{ flexDirection: "column", padding: "20px 12px", gap: 10 }}
              onClick={() => setScreen("split")}
            >
              <Users size={24} />
              <span>🧾 Ping Split</span>
              <small style={{ fontWeight: 400, opacity: 0.8 }}>Escrow bill pooling</small>
            </button>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Active Escrow Splits</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {splits.slice(0, 2).map((s) => (
                <div key={s.id} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <strong>{s.title}</strong>
                    <span className={`badge ${s.current >= s.goal ? "badge-closed" : "badge-active"}`}>
                      {s.current >= s.goal ? "Funded" : "Active"}
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${Math.min(100, (s.current / s.goal) * 100)}%` }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                    <span>{s.current} / {s.goal} XLM</span>
                    <span>Share: {s.share} XLM</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Screen: Drop */}
      {screen === "drop" && (
        <div className="card">
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>🎁 Send a Ping Drop</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
            Lock funds into a Stellar Claimable Balance. Send the link to any chat—anyone who taps it claims instantly.
          </p>

          <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Amount (XLM)</label>
          <input
            className="input-field"
            type="number"
            value={dropAmount}
            onChange={(e) => setDropAmount(e.target.value)}
            placeholder="5"
          />

          <button
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 20 }}
            disabled={loading}
            onClick={handleCreateDrop}
          >
            {loading ? "Generating Drop..." : "⚡ Generate Ping Drop"}
          </button>

          {dropGeneratedUrl && (
            <div style={{ marginTop: 20, padding: 14, backgroundColor: "#0f172a", borderRadius: 12, border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: 13, color: "#4ade80", display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle size={16} /> Drop Link Ready:
              </span>
              <p style={{ wordBreak: "break-all", fontSize: 12, margin: "8px 0", color: "#94a3b8" }}>
                {dropGeneratedUrl}
              </p>
              <button
                className="btn btn-secondary"
                style={{ width: "100%", padding: "8px 12px", fontSize: 13 }}
                onClick={() => {
                  navigator.clipboard.writeText(dropGeneratedUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy size={14} /> {copied ? "Copied!" : "Copy Share Link"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Screen: Claim Drop */}
      {screen === "claim" && (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🎁</div>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>Claim Ping Drop</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
            You have received a Ping payment on Stellar! Tap below to claim the balance into your wallet.
          </p>

          <button
            className="btn btn-success"
            style={{ width: "100%", padding: "14px 20px" }}
            disabled={loading}
            onClick={handleClaimDrop}
          >
            {loading ? "Claiming..." : "⚡ Claim Into My Wallet"}
          </button>

          {claimStatus && (
            <div style={{ marginTop: 16, fontSize: 14, color: claimStatus.includes("Successfully") ? "#4ade80" : "#f87171" }}>
              {claimStatus}
            </div>
          )}
        </div>
      )}

      {/* Screen: Split */}
      {screen === "split" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>🧾 Start a New Split Escrow</h2>
            <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Title / Event</label>
            <input
              className="input-field"
              type="text"
              value={splitTitle}
              onChange={(e) => setSplitTitle(e.target.value)}
              placeholder="e.g. Airbnb Weekend"
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Total Goal (XLM)</label>
                <input
                  className="input-field"
                  type="number"
                  value={splitGoal}
                  onChange={(e) => setSplitGoal(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Share Per Friend</label>
                <input
                  className="input-field"
                  type="number"
                  value={splitShare}
                  onChange={(e) => setSplitShare(e.target.value)}
                  placeholder="25"
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={handleCreateSplit}
            >
              Create Smart Escrow Split
            </button>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Active Escrow Splits</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {splits.map((s) => (
                <div
                  key={s.id}
                  style={{
                    backgroundColor: "#0f172a",
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{s.title}</strong>
                    <span className={`badge ${s.current >= s.goal ? "badge-closed" : "badge-active"}`}>
                      {s.current >= s.goal ? "Completed" : s.deadline}
                    </span>
                  </div>

                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${Math.min(100, (s.current / s.goal) * 100)}%` }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}>
                    <span>Collected: {s.current} / {s.goal} XLM</span>
                    <span>Share: {s.share} XLM</span>
                  </div>

                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                    Participants ({s.participants.length}): {s.participants.join(", ")}
                  </div>

                  {s.current < s.goal ? (
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%", padding: "10px" }}
                      onClick={() => handleContribute(s.id)}
                    >
                      Chip In {s.share} XLM
                    </button>
                  ) : (
                    <div style={{ textAlign: "center", color: "#4ade80", fontSize: 13, fontWeight: 600 }}>
                      ✓ Goal Reached — Funds Released to Organizer!
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
