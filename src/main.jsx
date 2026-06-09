import React from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import SongCraft from "./SongCraft";
import ChatWidget from "./ChatWidget";

createRoot(document.getElementById("root")).render(
  <>
    <SongCraft />
    <ChatWidget />
    <Analytics />
  </>
);
