export const migration1 = `
    CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    price TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

`;