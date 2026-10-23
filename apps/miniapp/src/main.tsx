import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

type Screen = "home" | "drop" | "split";

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  if (screen === "drop") return <Placeholder title="🎁 Ping Drop" onBack={() => setScreen("home")} />;
  if (screen === "split") return <Placeholder title="🧾 Ping Split" onBack={() => setScreen("home")} />;
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>⚡ Ping</h1>
      <p>Money that flies like messages.</p>
      <button onClick={() => setScreen("drop")}>Send a Drop</button>{" "}
      <button onClick={() => setScreen("split")}>Start a Split</button>
    </main>
  );
}

function Placeholder({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>{title}</h2>
      <p>Coming soon.</p>
      <button onClick={onBack}>← Back</button>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
