import express, { Request, Response, Router } from 'express';
import { v4 } from 'uuid';

import { db } from '../..';
import { createUser } from '../users/db';
import {
    countEvents,
    createEvent,
    deleteEvent,
    getEvent,
    getEvents,
    updateEvent
} from './db';

export function getRouter(): Router {
    const router = express.Router();

    // Ambil semua event
    router.get(
        '/',
        (
            req: Request<any, any, any, { limit?: string; offset?: string }>,
            res
        ) => {
            const limit = Number(req.query.limit ?? 100); // default 100 jika -1
            const offset = Number(req.query.offset ?? 0);

            const events = getEvents(db, limit, offset);

            res.json(events);
        }
    );

    // Hitung total event
    router.get('/count', (_req, res) => {
        res.json(countEvents(db));
    });

    // Ambil 1 event
    router.get('/:id', (req, res) => {
        const { id } = req.params;

        const event = getEvent(db, Number(id));

        res.json(event);
    });

    // Buat event baru
    router.post(
        '/',
        (req: Request<
            any,
            any,
            { name: string; date: string; location: string; price: string; capacity: number }
        >,
        res
    ) => {
            const { name, date, location, price, capacity } = req.body;

            // contoh: buat user organizer dummy
            const user = createUser(db, {
                username: `organizer${v4()}`,
                age: 30
            });

            const event = createEvent(db, {
                user_id: user.id,
                name,
                date,
                location,
                price,
                capacity
            });

            res.json(event);
        }
    );

    // Batch buat event
    router.post('/batch/:num', (req, res) => {
        const num = Number(req.params.num);

        for (let i = 0; i < num; i++) {
            const user = createUser(db, {
                username: `organizer${v4()}`,
                age: 25 + i
            });

            createEvent(db, {
                user_id: user.id,
                name: `Event ${v4()}`,
                date: `2025-08-${String(10 + i).padStart(2, '0')}`,
                location: `Location ${i}`,
                price: (0.01 * (i + 1)).toFixed(2),
                capacity: 100  // default kapasitas
            });
        }

        res.send({
            success: `${num} events created`
        });
    });

    // Update event (PUT/PATCH)
    router.put('/', updateHandler);
    router.patch('/', updateHandler);

    // Hapus event
    router.delete('/', (req: Request<any, any, { id: number }>, res) => {
        const { id } = req.body;

        const deletedId = deleteEvent(db, id);

        res.json({ deletedId });
    });

    return router;
}

// Handler update event
function updateHandler(
    req: Request<
        any,
        any,
        { id: number; user_id?: number; name?: string; date?: string; location?: string; price?: string; capacity?: number }
    >,
    res: Response
): void {
    const { id, user_id, name, date, location, price, capacity } = req.body;

    const event = updateEvent(db, {
        id,
        user_id,
        name,
        date,
        location,
        price,
        capacity
    });

    res.json(event);
}
