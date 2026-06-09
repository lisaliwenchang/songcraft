import React from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import SongCraft from "./SongCraft";

createRoot(document.getElementById("root")).render(
  <>
    <SongCraft />
    <Analytics />
  </>
);
