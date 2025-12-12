import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Import styles first
import "./index.css";

// Initialize observability before React
import { initSentry } from "./lib/sentry";
import { initOpenTelemetry } from "./lib/opentelemetry";

// Initialize Sentry
initSentry();

// Initialize OpenTelemetry
initOpenTelemetry();

// Import App after initialization
import App from "./App";

// Render the app
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
