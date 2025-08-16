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

  // ===== Edit state =====
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEventData, setEditEventData] = useState({
    name: "",
    date: "",
    location: "",
    price: "",
  });

  // ===== Fetch all events =====
  useEffect(() => {
    fetch("http://w7lou-c7777-77774-qaamq-cai.raw.localhost:4943/events")
      .then((res) => res.json())
      .then((data: Event[]) => setEvents(data))
      .finally(() => setLoading(false));
  }, []);

  // ===== Add Event =====
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

  // ===== Delete Event =====
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

  // ===== Start Editing =====
  const startEdit = (event: Event) => {
    setEditingId(event.id);
    setEditEventData({
      name: event.name,
      date: event.date,
      location: event.location,
      price: event.price,
    });
  };

  // ===== Cancel Editing =====
  const cancelEdit = () => setEditingId(null);

  // ===== Save Editing =====
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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <h1>Events</h1>

      {/* Add New Event */}
      <div className="card">
        <h2>Add New Event</h2>
        <div className="form-row">
          <input
            type="text"
            placeholder="Name"
            value={newEvent.name}
            onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
          />
          <input
            type="date"
            value={newEvent.date}
            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
          />
          <input
            type="text"
            placeholder="Location"
            value={newEvent.location}
            onChange={(e) =>
              setNewEvent({ ...newEvent, location: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Price"
            value={newEvent.price}
            onChange={(e) =>
              setNewEvent({ ...newEvent, price: e.target.value })
            }
          />
        </div>
        <button className="btn add" onClick={handleAddEvent}>
          Add
        </button>
      </div>

      {/* Events List */}
      <ul className="events-list">
        {events.map((event) => (
          <li key={event.id} className="event-item">
            {editingId === event.id ? (
              <div className="event-edit">
                <input
                  type="text"
                  value={editEventData.name}
                  onChange={(e) =>
                    setEditEventData({ ...editEventData, name: e.target.value })
                  }
                />
                <input
                  type="date"
                  value={editEventData.date}
                  onChange={(e) =>
                    setEditEventData({ ...editEventData, date: e.target.value })
                  }
                />
                <input
                  type="text"
                  value={editEventData.location}
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
                  onChange={(e) =>
                    setEditEventData({
                      ...editEventData,
                      price: e.target.value,
                    })
                  }
                />
                <button className="btn save" onClick={() => saveEdit(event.id)}>
                  Save
                </button>
                <button className="btn cancel" onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div className="event-info">
                  <strong>{event.name}</strong> <br />
                  {event.date} — {event.location} — ${event.price}
                </div>
                <div className="event-actions">
                  <button className="btn edit" onClick={() => startEdit(event)}>
                    Edit
                  </button>
                  <button
                    className="btn delete"
                    onClick={() => handleDelete(event.id)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* CSS */}
      <style>
        {`
          body {
            background-color: #121212;
            color: #eee;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }

          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
          }

          h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            text-align: center;
          }

          .card {
            background-color: #1e1e1e;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            margin-bottom: 20px;
          }

          h2 {
            margin-bottom: 12px;
            color: #bbb;
          }

          .form-row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 12px;
          }

          input {
            flex: 1;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #555;
            background-color: #2a2a2a;
            color: #eee;
            font-size: 14px;
          }

          input:focus {
            outline: none;
            border-color: #4f46e5;
            box-shadow: 0 0 5px #4f46e5;
          }

          .btn {
            padding: 10px 18px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all 0.3s ease;
            margin-left: 5px;
          }

          .btn.add {
            background-color: #4f46e5;
            color: #fff;
          }
          .btn.add:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
          }

          .btn.edit {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: #fff;
          }
          .btn.edit:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(251,191,36,0.6);
          }

          .btn.save {
            background: linear-gradient(135deg, #10b981, #34d399);
            color: #fff;
          }
          .btn.save:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(16,185,129,0.6);
          }

          .btn.cancel {
            background: #555;
            color: #fff;
          }
          .btn.cancel:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(85,85,85,0.6);
          }

          .btn.delete {
            background-color: #e53935;
            color: #fff;
          }
          .btn.delete:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
          }

          .events-list {
            list-style: none;
            padding: 0;
          }

          .event-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #333;
            padding: 12px 0;
            flex-wrap: wrap;
          }

          .event-info {
            line-height: 1.4;
          }

          .event-actions {
            display: flex;
            gap: 5px;
          }

          .event-edit input {
            margin-bottom: 5px;
          }

          .loading {
            text-align: center;
            color: #ccc;
            font-size: 18px;
            margin-top: 50px;
          }
        `}
      </style>
    </div>
  );
}
