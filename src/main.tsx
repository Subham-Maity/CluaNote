import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initDb } from "./lib/db";

// Fire-and-forget DB initialization without blocking first paint
initDb().catch((err) => console.error("Database pre-initialization error:", err));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
