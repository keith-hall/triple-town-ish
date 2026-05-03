import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./app/globals.css";
import { HomePage } from "./components/HomePage";
import { GameClient } from "./components/GameClient";
import { ReplayViewerClient } from "./components/ReplayViewerClient";

function getRoute(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    function onHashChange() {
      setRoute(getRoute());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (route === "/game") return <GameClient />;
  if (route === "/replay") return <ReplayViewerClient />;
  return <HomePage />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
