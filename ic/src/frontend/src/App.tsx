// AzleApp.tsx
// @ts-nocheck
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Payment from "./Payment";
import Home from "./Home";
import "./chat.css";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/payment" element={<Payment />} />
      </Routes>
    </Router>
  );
}
