import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { ColorThemeProvider } from "./colorThemeProvider";
import { Root } from "./routes/root";
import { Station } from "./routes/station";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Root />,
    },
    {
      path: "/:environmentKey",
      element: <Station />,
    },
    {
      path: "/:environmentKey/:session",
      element: <Station />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ColorThemeProvider>
      <RouterProvider router={router} />
    </ColorThemeProvider>
  </React.StrictMode>,
);
