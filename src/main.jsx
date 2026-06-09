import React from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import SongCraft from "./SongCraft";
import ChatWidget from "./ChatWidget";
import Admin from "./Admin";

const isAdmin = window.location.pathname.replace(/\/$/, "") === "/admin";

createRoot(document.getElementById("root")).render(
  isAdmin ? (
    <Admin />
  ) : (
    <>
      <SongCraft />
      <ChatWidget />
      <Analytics />
    </>
  )
);
