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
      <div className="text-center text-gray-400 mt-20 text-lg">Loading...</div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Events</h1>

      {/* Add New Event */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-xl text-gray-300 mb-4">Add New Event</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <input
            type="text"
            placeholder="Name"
            className="flex-1 p-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={newEvent.name}
            onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
          />
          <input
            type="date"
            className="flex-1 p-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={newEvent.date}
            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
          />
          <input
            type="text"
            placeholder="Location"
            className="flex-1 p-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={newEvent.location}
            onChange={(e) =>
              setNewEvent({ ...newEvent, location: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Price (ETH)"
            className="flex-1 p-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={newEvent.price}
            onChange={(e) =>
              setNewEvent({ ...newEvent, price: e.target.value })
            }
          />
        </div>
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition"
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
            className="bg-gray-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center shadow"
          >
            {editingId === event.id ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                <input
                  type="text"
                  value={editEventData.name}
                  className="p-2 rounded-md bg-gray-700 border border-gray-600 text-white flex-1"
                  onChange={(e) =>
                    setEditEventData({ ...editEventData, name: e.target.value })
                  }
                />
                <input
                  type="date"
                  value={editEventData.date}
                  className="p-2 rounded-md bg-gray-700 border border-gray-600 text-white flex-1"
                  onChange={(e) =>
                    setEditEventData({ ...editEventData, date: e.target.value })
                  }
                />
                <input
                  type="text"
                  value={editEventData.location}
                  className="p-2 rounded-md bg-gray-700 border border-gray-600 text-white flex-1"
                  onChange={(e) =>
                    setEditEventData({
                      ...editEventData,
                      location: e.target.value,
                    })
                  }
                />
                <input
                  type="text"
                  value={editEventData.price}
                  className="p-2 rounded-md bg-gray-700 border border-gray-600 text-white flex-1"
                  onChange={(e) =>
                    setEditEventData({
                      ...editEventData,
                      price: e.target.value,
                    })
                  }
                />
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
                <div className="text-white mb-2 sm:mb-0">
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
