// AzleApp.tsx
// @ts-nocheck
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Payment from "./Payment";
import Home from "./Home";
import "./chat.css";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Homepage */}
        <Route path="/" element={<Home />} />

        {/* Payment dengan param eventId */}
        <Route path="/payment/:eventId" element={<Payment />} />
      </Routes>
    </Router>
  );
}
