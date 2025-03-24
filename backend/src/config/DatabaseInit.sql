CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT ,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    profile_picture_url TEXT,
    location TEXT,
    bio TEXT,
    date_joined INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS genres (
    genre_id INTEGER PRIMARY KEY AUTOINCREMENT,
    genre_name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS user_genres (
    user_id INTEGER,
    genre_id INTEGER,
    PRIMARY KEY (user_id, genre_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO genres (genre_name) 
VALUES ('Fantasy'), ('Science Fiction'), ('Mystery'),
('Romance'), ('Thriller'), ('Horror'), ('Historical Fiction'),
('Non-Fiction'), ('Biography'), ('Autobiography'), ('Self-Help'),
('Cookbook');

CREATE TABLE IF NOT EXISTS books (
    book_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    genre_id INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_genre_id ON books(genre_id);

CREATE TABLE IF NOT EXISTS book_listings (
    listing_id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT,
    list_on_date INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exchange_requests (
    request_id INTEGER PRIMARY KEY AUTOINCREMENT,
    requestee_listing_id INTEGER NOT NULL,
    requester_listing_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    request_date INTEGER NOT NULL,
    FOREIGN KEY (requestee_listing_id) REFERENCES book_listings(listing_id) ON DELETE CASCADE,
    FOREIGN KEY (requester_listing_id) REFERENCES book_listings(listing_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exchange_requestee ON exchange_requests(requestee_listing_id);
CREATE INDEX IF NOT EXISTS idx_exchange_requester ON exchange_requests(requester_listing_id);