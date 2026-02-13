import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { ColorThemeProvider } from "./colorThemeProvider";
import { AppShell } from "./modes/AppShell";
import { Root } from "./routes/root";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ColorThemeProvider>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/:environmentKey/*" element={<AppShell />} />
        </Routes>
      </ColorThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
