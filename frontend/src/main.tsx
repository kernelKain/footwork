import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/system.css";
import "./styles/journey.css";
import "./styles/screens.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
