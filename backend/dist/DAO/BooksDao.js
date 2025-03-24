import Database from 'better-sqlite3';
import * as fs from 'fs';
export class BookNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BookNotFoundError';
    }
}
export class CreateBookError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CreateBookError';
    }
}
export class UpdateBookError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UpdateBookError';
    }
}
export class GenreNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GenreNotFoundError';
    }
}
export class BooksDAO {
    constructor(dbPath, sqlFilePath) {
        this.db = new Database(dbPath);
        const sql = fs.readFileSync(sqlFilePath).toString();
        this.db.exec(sql);
    }
    /**
     * Creates a new book listing in the database.
     * @param bookData An object containing the book's information, including the genre_name.
     * @returns The newly created book object, including the generated book_id.
     * @throws {GenreNotFoundError} If the specified genre name doesn't exist.
     * @throws {CreateBookError} If the book creation fails, including database errors or failure to retrieve the created book.
     */
    createBook(bookData) {
        const transaction = this.db.transaction(() => {
            // Find the genre_id for the provided genre_name
            const genre = this.getGenreByName(bookData.genre_name);
            if (!genre) {
                throw new GenreNotFoundError(`Genre with name "${bookData.genre_name}" not found`);
            }
            const insertBookStatement = this.db.prepare(`
                INSERT INTO books (
                    title, author, genre_id, description
                ) VALUES (?, ?, ?, ?)
            `);
            const result = insertBookStatement.run(bookData.title, bookData.author, genre.genre_id, bookData.description);
            const bookId = result.lastInsertRowid;
            // Returns the newly created book
            return this.getBookById(bookId);
        });
        try {
            return transaction();
        }
        catch (error) {
            if (error instanceof GenreNotFoundError) {
                throw error; // Re-throw genre not found errors
            }
            if (error instanceof BookNotFoundError) {
                throw new CreateBookError(`Failed to retrieve created book. Transaction failed and rolled back.`);
            }
            throw new CreateBookError(`Failed to create book: ${error.message}`);
        }
    }
    /**
     * Retrieves a book from the database by its book ID.
     * @param bookId The ID of the book to retrieve.
     * @returns The book object if found.
     * @throws {BookNotFoundError} If no book is found with the given ID.
     */
    getBookById(bookId) {
        const statement = this.db.prepare(`
            SELECT b.book_id, b.title, b.author, b.genre_id, g.genre_name, b.description 
            FROM books b
            JOIN genres g ON b.genre_id = g.genre_id
            WHERE b.book_id = ?
        `);
        const book = statement.get(bookId);
        if (!book) {
            throw new BookNotFoundError(`Book with ID ${bookId} not found`);
        }
        return book;
    }
    /**
     * Retrieves all books from the database.
     * @returns Array of book listings.
     */
    getAllBooks() {
        const statement = this.db.prepare(`
            SELECT b.book_id, b.title, b.author, b.genre_id, g.genre_name, b.description 
            FROM books b
            JOIN genres g ON b.genre_id = g.genre_id
        `);
        return statement.all();
    }
    /**
     * Retrieves books by genre ID.
     * @param genreId The genre ID to filter by.
     * @returns Array of book listings matching the specified genre ID.
     */
    getBooksByGenreId(genreId) {
        const statement = this.db.prepare(`
            SELECT b.book_id, b.title, b.author, b.genre_id, g.genre_name, b.description 
            FROM books b
            JOIN genres g ON b.genre_id = g.genre_id
            WHERE b.genre_id = ?
        `);
        return statement.all(genreId);
    }
    /**
     * Retrieves books by genre name.
     * @param genreName The genre name to filter by.
     * @returns Array of book listings matching the specified genre name.
     */
    getBooksByGenre(genreName) {
        const statement = this.db.prepare(`
            SELECT b.book_id, b.title, b.author, b.genre_id, g.genre_name, b.description 
            FROM books b
            JOIN genres g ON b.genre_id = g.genre_id
            WHERE g.genre_name = ?
        `);
        return statement.all(genreName);
    }
    /**
     * Updates a book's information in the database.
     * @param bookId - The unique identifier of the book to update
     * @param updates - Partial book object containing fields to update. Cannot update book_id.
     * @returns Updated book object
     * @throws {UpdateBookError} When the book cannot be found after update
     * @throws {Error} When the update operation fails
     */
    updateBook(bookId, updates) {
        const transaction = this.db.transaction(() => {
            try {
                let updateFields = [];
                let updateValues = [];
                for (const [key, value] of Object.entries(updates)) {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(value);
                }
                if (updateFields.length > 0) {
                    const statement = this.db.prepare(`
                        UPDATE books 
                        SET ${updateFields.join(', ')} 
                        WHERE book_id = ?
                    `);
                    statement.run(...updateValues, bookId);
                }
                return this.getBookById(bookId);
            }
            catch (error) {
                if (error instanceof BookNotFoundError) {
                    throw new UpdateBookError(`Failed to retrieve updated book. Transaction failed and rolled back.`);
                }
                throw new Error(`Failed to update book: ${error.message}`);
            }
        });
        return transaction();
    }
    /**
     * Deletes a book from the database based on its book ID
     * @param bookId - The unique identifier of the book to delete
     * @returns {boolean} True if the book was successfully deleted, false if the book was not found
     * @throws {Error} If there is a database error during deletion
     */
    deleteBook(bookId) {
        const statement = this.db.prepare('DELETE FROM books WHERE book_id = ?');
        const result = statement.run(bookId);
        return result.changes > 0;
    }
    /**
     * Searches for books by title, author, or description
     * @param searchTerm - The search term to look for
     * @returns Array of book listings matching the search criteria
     */
    searchBooksByTitle(searchTerm) {
        const statement = this.db.prepare(`
            SELECT book_id, title, author, genre_id, description FROM books 
            WHERE title LIKE ?
        `);
        const searchPattern = `${searchTerm}%`;
        return statement.all(searchPattern);
    }
    /**
     * Searches for books by author name
     * @param authorName - The author name to search for
     * @returns Array of book listings matching the author name criteria
     */
    searchBooksByAuthor(authorName) {
        const statement = this.db.prepare(`
            SELECT book_id, title, author, genre_id, description FROM books 
            WHERE author LIKE ?
        `);
        const searchPattern = `${authorName}%`;
        return statement.all(searchPattern);
    }
    /**
     * Gets all available genres from the database.
     * @returns Array of genre objects with id and name.
     */
    getAllGenres() {
        const statement = this.db.prepare('SELECT genre_id, genre_name FROM genres');
        return statement.all();
    }
    /**
     * Gets a genre by its ID.
     * @param genreId The ID of the genre to retrieve.
     * @returns The genre object if found.
     */
    getGenreById(genreId) {
        const statement = this.db.prepare('SELECT genre_id, genre_name FROM genres WHERE genre_id = ?');
        return statement.get(genreId);
    }
    /**
     * Gets a genre by its name.
     * @param genreName The name of the genre to retrieve.
     * @returns The genre object if found.
     */
    getGenreByName(genreName) {
        const statement = this.db.prepare('SELECT genre_id, genre_name FROM genres WHERE genre_name = ?');
        return statement.get(genreName);
    }
}
