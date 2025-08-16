// src/pages/Events.tsx
// @ts-nocheck
import React, { useEffect, useState } from "react";

interface Event {
  id: number;
  user_id: number;
  name: string;
  date: string;
  location: string;
  price: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({
    name: "",
    date: "",
    location: "",
    price: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEventData, setEditEventData] = useState({
    name: "",
    date: "",
    location: "",
    price: "",
  });

  // Light / Dark mode state
  const [isLightMode, setIsLightMode] = useState(true);
  const toggleTheme = () => setIsLightMode((prev) => !prev);

  useEffect(() => {
    fetch("http://w7lou-c7777-77774-qaamq-cai.raw.localhost:4943/events")
      .then((res) => res.json())
      .then((data: Event[]) => setEvents(data))
      .finally(() => setLoading(false));
  }, []);

  const handleAddEvent = async () => {
    try {
      const res = await fetch(
        "http://w7lou-c7777-77774-qaamq-cai.raw.localhost:4943/events",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEvent),
        }
      );
      const createdEvent: Event = await res.json();
      setEvents((prev) => [...prev, createdEvent]);
      setNewEvent({ name: "", date: "", location: "", price: "" });
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan event");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(
        "http://w7lou-c7777-77774-qaamq-cai.raw.localhost:4943/events",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }
      );
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus event");
    }
  };

  const startEdit = (event: Event) => {
    setEditingId(event.id);
    setEditEventData({
      name: event.name,
      date: event.date,
      location: event.location,
      price: event.price,
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: number) => {
    try {
      const res = await fetch(
        "http://w7lou-c7777-77774-qaamq-cai.raw.localhost:4943/events",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...editEventData }),
        }
      );
      const updatedEvent: Event = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === id ? updatedEvent : e)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Gagal mengupdate event");
    }
  };

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

  return (
    <div
      className={`min-h-screen p-6 ${
        isLightMode ? "bg-gray-100 text-gray-900" : "bg-gray-900 text-gray-100"
      }`}
    >
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
          {["name", "date", "location", "price"].map((key) => (
            <input
              key={key}
              type={key === "date" ? "date" : "text"}
              placeholder={
                key === "price"
                  ? "Price (ETH)"
                  : key.charAt(0).toUpperCase() + key.slice(1)
              }
              className={`flex-1 p-2 rounded-md border focus:outline-none focus:ring-2 ${
                isLightMode
                  ? "bg-gray-100 border-gray-300 text-gray-900 focus:ring-indigo-500"
                  : "bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-400"
              }`}
              value={newEvent[key as keyof typeof newEvent]}
              onChange={(e) =>
                setNewEvent({ ...newEvent, [key]: e.target.value })
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
                {["name", "date", "location", "price"].map((key) => (
                  <input
                    key={key}
                    type={key === "date" ? "date" : "text"}
                    value={editEventData[key as keyof typeof editEventData]}
                    className={`p-2 rounded-md border flex-1 ${
                      isLightMode
                        ? "bg-gray-100 border-gray-300 text-gray-900"
                        : "bg-gray-700 border-gray-600 text-gray-100"
                    }`}
                    onChange={(e) =>
                      setEditEventData({
                        ...editEventData,
                        [key]: e.target.value,
                      })
                    }
                  />
                ))}
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
                  {event.date} — {event.location} — {event.price} ETH
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
