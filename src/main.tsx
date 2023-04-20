import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  redirect,
  RouterProvider,
} from "react-router-dom";

import { Station } from "./routes/station";

const router = createBrowserRouter(
  [
    {
      path: "/",
      loader: () => redirect("/cl9vt57vf0000qw4nmwr6glcm"),
    },
    {
      path: "/:stationId",
      element: <Station />,
    },
    {
      path: "/:stationId/:sessionId",
      element: <Station />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
