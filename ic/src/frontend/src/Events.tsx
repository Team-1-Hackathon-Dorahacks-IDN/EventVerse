// src/pages/Events.tsx
// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Identity, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { createActor } from "../../declarations/backend";

interface Event {
  id: number;
  user_id: number;
  name: string;
  date: string;
  location: string;
  price: string;
  capacity: number;
  booked_count: number;
}

export default function EventsPage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [newEvent, setNewEvent] = useState({
    name: "",
    date: "",
    location: "",
    price: "",
    capacity: 0,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEventData, setEditEventData] = useState({
    name: "",
    date: "",
    location: "",
    price: "",
    capacity: 0,
  });

  const [isLightMode, setIsLightMode] = useState(true);
  const toggleTheme = () => setIsLightMode((prev) => !prev);

  useEffect(() => {
    authenticateAndFetch();
  }, []);

  async function authenticateAndFetch() {
    try {
      const authClient = await AuthClient.create();
      let id: Identity;

      if (await authClient.isAuthenticated()) {
        id = authClient.getIdentity();
      } else {
        await new Promise((resolve, reject) => {
          authClient.login({
            identityProvider: import.meta.env.VITE_IDENTITY_PROVIDER,
            onSuccess: resolve,
            onError: reject,
            windowOpenerFeatures: `width=500,height=500`,
          });
        });
        id = authClient.getIdentity();
      }

      setIdentity(id);

      const agent = new HttpAgent({ identity: id });
      await agent.fetchRootKey();
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      fetchEvents(actor);
    } catch (err) {
      console.error("Authentication/Fetch error:", err);
    }
  }

  async function fetchEvents(actor) {
    setLoading(true);
    try {
      const res = await actor.http_request_update({
        url: "/events",
        method: "GET",
        body: new Uint8Array([]),
        headers: [],
      });

      if (res.status_code === 200) {
        const raw = new TextDecoder().decode(new Uint8Array(res.body));
        const data = JSON.parse(raw);
        setEvents(data);
      } else {
        throw new Error(`Gagal fetch events: ${res.status_code}`);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal fetch events");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEvent() {
    if (!identity) return alert("Login terlebih dahulu");

    try {
      const agent = new HttpAgent({ identity });
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      const res = await actor.http_request_update({
        url: "/events",
        method: "POST",
        body: new TextEncoder().encode(JSON.stringify(newEvent)),
        headers: [],
      });

      if (res.status_code === 200) {
        const raw = new TextDecoder().decode(new Uint8Array(res.body));
        const createdEvent = JSON.parse(raw);
        setEvents((prev) => [...prev, createdEvent]);
        setNewEvent({
          name: "",
          date: "",
          location: "",
          price: "",
          capacity: 0,
        });
      } else {
        throw new Error(`Gagal menambahkan event: ${res.status_code}`);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan event");
    }
  }

  async function handleDelete(id: number) {
    if (!identity) return alert("Login terlebih dahulu");

    try {
      const agent = new HttpAgent({ identity });
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      const res = await actor.http_request_update({
        url: "/events",
        method: "DELETE",
        body: new TextEncoder().encode(JSON.stringify({ id })),
        headers: [],
      });

      if (res.status_code === 200) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      } else {
        throw new Error(`Gagal hapus event: ${res.status_code}`);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus event");
    }
  }

  if (loading)
    return (
      <div
        className={`text-center mt-20 text-lg ${
          isLightMode ? "text-gray-600" : "text-gray-400"
        }`}
      >
        Loading...
      </div>
    );

  if (!identity)
    return (
      <div className="text-center mt-20">
        🔑 Silakan login menggunakan Internet Identity...
      </div>
    );
  return (
    <div
      className={`min-h-screen p-6 ${
        isLightMode ? "bg-gray-100 text-gray-900" : "bg-gray-900 text-gray-100"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center flex-1">Events</h1>
        <button
          className={`ml-4 px-4 py-2 rounded-md font-semibold transition ${
            isLightMode
              ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
              : "bg-gray-800 text-gray-200 hover:bg-gray-700"
          }`}
          onClick={toggleTheme}
        >
          {isLightMode ? "Dark Mode" : "Light Mode"}
        </button>
      </div>

      {/* Add New Event */}
      <div
        className={`p-6 rounded-xl shadow-md mb-8 ${
          isLightMode ? "bg-white" : "bg-gray-800"
        }`}
      >
        <h2
          className={`text-xl mb-4 ${
            isLightMode ? "text-gray-700" : "text-gray-200"
          }`}
        >
          Add New Event
        </h2>
        <div className="flex flex-wrap gap-4 mb-4">
          {["name", "date", "location", "price", "capacity"].map((key) => (
            <input
              key={key}
              type={
                key === "date" ? "date" : key === "capacity" ? "number" : "text"
              }
              placeholder={
                key === "price"
                  ? "Price (ETH)"
                  : key === "capacity"
                  ? "Capacity"
                  : key.charAt(0).toUpperCase() + key.slice(1)
              }
              className={`flex-1 p-2 rounded-md border focus:outline-none focus:ring-2 ${
                isLightMode
                  ? "bg-gray-100 border-gray-300 text-gray-900 focus:ring-indigo-500"
                  : "bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-400"
              }`}
              value={newEvent[key as keyof typeof newEvent]}
              onChange={(e) =>
                setNewEvent({
                  ...newEvent,
                  [key]:
                    key === "capacity"
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
            />
          ))}
        </div>
        <button
          className={`font-semibold py-2 px-4 rounded-md transition ${
            isLightMode
              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
              : "bg-indigo-500 hover:bg-indigo-600 text-gray-100"
          }`}
          onClick={handleAddEvent}
        >
          Add
        </button>
      </div>

      {/* Events List */}
      <ul className="space-y-4">
        {events.map((event) => (
          <li
            key={event.id}
            className={`p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center shadow ${
              isLightMode ? "bg-white" : "bg-gray-800"
            }`}
          >
            {editingId === event.id ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                {["name", "date", "location", "price", "capacity"].map(
                  (key) => (
                    <input
                      key={key}
                      type={
                        key === "date"
                          ? "date"
                          : key === "capacity"
                          ? "number"
                          : "text"
                      }
                      value={editEventData[key as keyof typeof editEventData]}
                      className={`p-2 rounded-md border flex-1 ${
                        isLightMode
                          ? "bg-gray-100 border-gray-300 text-gray-900"
                          : "bg-gray-700 border-gray-600 text-gray-100"
                      }`}
                      onChange={(e) =>
                        setEditEventData({
                          ...editEventData,
                          [key]:
                            key === "capacity"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                    />
                  )
                )}
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md transition"
                    onClick={() => saveEdit(event.id)}
                  >
                    Save
                  </button>
                  <button
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md transition"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <div className="mb-2 sm:mb-0">
                  <strong>{event.name}</strong> <br />
                  {event.date} — {event.location} — {event.price} ETH <br />
                  Capacity: {event.booked_count}/{event.capacity}
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md transition"
                    onClick={() => startEdit(event)}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md transition"
                    onClick={() => handleDelete(event.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
