import { Database, SqlValue } from 'sql.js/dist/sql-asm.js';
import { sqlite } from '../../db';
import { User } from '../users/db';

export type Event = {
    id: number;
    name: string;
    date: string;      // format ISO string
    location: string;
    price: string;     // harga sebagai string, misal "0.01"
    capacity: number;
    booked_count: number;
    min_age?: number;
    user: User;        // organizer
};

export type EventCreate = Omit<Event, 'id' | 'user' | 'booked_count'> & { user_id: number };
export type EventUpdate = Pick<Event, 'id'> & Partial<EventCreate & { booked_count: number }>;


// Ambil semua event
export function getEvents(db: Database, limit: number, offset: number): Event[] {
    return sqlite<Event>`
        SELECT events.id, events.user_id, events.name, events.date, events.location,
               users.id, users.username, users.age, events.price,
               events.capacity, events.booked_count, events.min_age
        FROM events
        JOIN users ON events.user_id = users.id
        ORDER BY events.date ASC
        LIMIT ${limit} OFFSET ${offset}
    `(db, convertEvent);
}

// Ambil 1 event berdasarkan ID
export function getEvent(db: Database, id: number): Event | null {
    const events =
        sqlite<Event>`
            SELECT events.id, events.user_id, events.name, events.date, events.location,
                   users.id, users.username, users.age, events.price,
                   events.capacity, events.booked_count, events.min_age
            FROM events
            JOIN users ON events.user_id = users.id
            WHERE events.id = ${id}
        `(db, convertEvent);

    return events.length === 0 ? null : events[0];
}

// Hitung jumlah event
export function countEvents(db: Database): number {
    const results = sqlite<number>`SELECT COUNT(*) FROM events`(
        db,
        (sqlValues) => sqlValues[0] as number
    );

    return results[0] ?? 0;
}

// Tambah event baru
export function createEvent(db: Database, eventCreate: EventCreate): Event {
    sqlite`
        INSERT INTO events (user_id, name, date, location, price, capacity, min_age)
        VALUES (${eventCreate.user_id}, ${eventCreate.name}, ${eventCreate.date}, 
                ${eventCreate.location}, ${eventCreate.price}, ${eventCreate.capacity},
                ${eventCreate.min_age ?? null})
    `(db);

    const id = sqlite<number>`SELECT last_insert_rowid()`(
        db,
        (sqlValues) => sqlValues[0] as number
    )[0];

    const event = getEvent(db, id);

    if (!event) {
        throw new Error(`createEvent: could not create event with id ${id}`);
    }

    return event;
}

// Update event
export function updateEvent(db: Database, eventUpdate: EventUpdate): Event {
    sqlite`
        UPDATE events
        SET user_id = COALESCE(${eventUpdate.user_id}, user_id),
            name = COALESCE(${eventUpdate.name}, name),
            date = COALESCE(${eventUpdate.date}, date),
            location = COALESCE(${eventUpdate.location}, location),
            price = COALESCE(${eventUpdate.price}, price),
            capacity = COALESCE(${eventUpdate.capacity}, capacity),
            booked_count = COALESCE(${eventUpdate.booked_count}, booked_count),
            min_age = COALESCE(${eventUpdate.min_age}, min_age)
        WHERE id = ${eventUpdate.id}
    `(db);

    const event = getEvent(db, eventUpdate.id);

    if (!event) {
        throw new Error(`updateEvent: could not find event with id ${eventUpdate.id}`);
    }

    return event;
}

// Hapus event
export function deleteEvent(db: Database, id: number): number {
    sqlite`DELETE FROM events WHERE id = ${id}`(db);

    const event = getEvent(db, id);

    if (event) {
        throw new Error(`deleteEvent: could not delete event with id ${id}`);
    }

    return id;
}

// Konversi hasil query ke objek Event
export function convertEvent(sqlValues: SqlValue[]): Event {
    return {
        id: sqlValues[0] as number,
        name: sqlValues[2] as string,
        date: sqlValues[3] as string,
        location: sqlValues[4] as string,
        price: sqlValues[8] as string,
        capacity: sqlValues[9] as number,
        booked_count: sqlValues[10] as number,
        min_age: sqlValues[11] as number,
        user: {
            id: sqlValues[5] as number,
            username: sqlValues[6] as string,
            age: sqlValues[7] as number
        }
    };
}
