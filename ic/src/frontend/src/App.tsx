// AzleApp.tsx
// @ts-nocheck
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Payment from "./Payment";
import Chat from "./Chat";
import Events from "./Events";
import ZKComponent from "./Zk";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Homepage */}
        <Route path="/" element={<Chat />} />

        {/* Payment dengan param eventId */}
        <Route path="/payment/:eventId" element={<Payment />} />
        <Route path="/events" element={<Events />} />
        <Route path="/zk" element={<ZKComponent />} />
      </Routes>
    </Router>
  );
}
