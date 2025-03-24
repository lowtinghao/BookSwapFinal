import Database from 'better-sqlite3';
import * as fs from 'fs';
export class BookListingNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BookListingNotFoundError';
    }
}
export class CreateBookListingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CreateBookListingError';
    }
}
export class UpdateBookListingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UpdateBookListingError';
    }
}
export class BookListingsDAO {
    constructor(dbPath, sqlFilePath) {
        this.db = new Database(dbPath);
        const sql = fs.readFileSync(sqlFilePath).toString();
        this.db.exec(sql);
    }
    /**
     * Creates a new book listing in the database.
     * @param bookListing An object containing the listing information, excluding the listing_id.
     * @returns The newly created book listing object, including the generated listing_id.
     * @throws {CreateBookListingError} If the listing creation fails.
     */
    createBookListing(bookListing) {
        const transaction = this.db.transaction(() => {
            const insertListingStatement = this.db.prepare(`
                INSERT INTO book_listings (
                    description, list_on_date, user_id, book_id
                ) VALUES (?, ?, ?, ?)
            `);
            // Use current Unix time if list_on_date is null
            const listOnDate = bookListing.list_on_date ?? Math.floor(Date.now() / 1000);
            const result = insertListingStatement.run(bookListing.description, listOnDate, bookListing.user_id, bookListing.book_id);
            const listingId = result.lastInsertRowid;
            // Returns the newly created listing
            return this.getBookListingById(listingId);
        });
        try {
            return transaction();
        }
        catch (error) {
            if (error instanceof BookListingNotFoundError) {
                throw new CreateBookListingError(`Failed to retrieve created listing. Transaction failed and rolled back.`);
            }
            throw new CreateBookListingError(`Failed to create listing: ${error.message}`);
        }
    }
    /**
     * Retrieves a book listing from the database by its ID.
     * @param listingId The ID of the book listing to retrieve.
     * @returns The book listing object if found.
     * @throws {BookListingNotFoundError} If no listing is found with the given ID.
     */
    getBookListingById(listingId) {
        const statement = this.db.prepare('SELECT * FROM book_listings WHERE listing_id = ?');
        const listing = statement.get(listingId);
        if (!listing) {
            throw new BookListingNotFoundError(`Book listing with ID ${listingId} not found`);
        }
        return listing;
    }
    /**
     * Retrieves all book listings from the database.
     * @returns Array of book listings.
     */
    getAllBookListings() {
        const statement = this.db.prepare('SELECT * FROM book_listings');
        return statement.all();
    }
    /**
     * Retrieves book listings by user ID.
     * @param userId The user ID to filter by.
     * @returns Array of book listings for the specified user.
     */
    getBookListingsByUser(userId) {
        const statement = this.db.prepare('SELECT * FROM book_listings WHERE user_id = ?');
        return statement.all(userId);
    }
    /**
     * Retrieves book listings by book ID.
     * @param bookId The book ID to filter by.
     * @returns Array of book listings for the specified book.
     */
    getBookListingsByBook(bookId) {
        const statement = this.db.prepare('SELECT * FROM book_listings WHERE book_id = ?');
        return statement.all(bookId);
    }
    /**
     * Updates a book listing's information in the database.
     *
     * @param listingId - The unique identifier of the listing to update
     * @param updates - Partial listing object containing fields to update. Cannot update listing_id.
     * @returns Updated book listing object
     * @throws {UpdateBookListingError} When the listing cannot be found after update
     * @throws {Error} When the update operation fails
     */
    updateBookListing(listingId, updates) {
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
                        UPDATE book_listings 
                        SET ${updateFields.join(', ')} 
                        WHERE listing_id = ?
                    `);
                    statement.run(...updateValues, listingId);
                }
                return this.getBookListingById(listingId);
            }
            catch (error) {
                if (error instanceof BookListingNotFoundError) {
                    throw new UpdateBookListingError(`Failed to retrieve updated listing. Transaction failed and rolled back.`);
                }
                throw new Error(`Failed to update listing: ${error.message}`);
            }
        });
        return transaction();
    }
    /**
     * Deletes a book listing from the database based on its ID
     * @param listingId - The unique identifier of the listing to delete
     * @returns {boolean} True if the listing was successfully deleted, false if the listing was not found
     * @throws {Error} If there is a database error during deletion
     */
    deleteBookListing(listingId) {
        const statement = this.db.prepare('DELETE FROM book_listings WHERE listing_id = ?');
        const result = statement.run(listingId);
        return result.changes > 0;
    }
    /**
     * Deletes multiple book listings by their IDs within a single transaction
     * @param listingIds - Array of listing IDs to delete
     * @returns {number} The number of successfully deleted listings
     * @throws {Error} If there is a database error during the transaction
     */
    deleteMultipleBookListings(listingIds) {
        if (listingIds.length === 0) {
            return 0;
        }
        const transaction = this.db.transaction(() => {
            const deleteStatement = this.db.prepare('DELETE FROM book_listings WHERE listing_id = ?');
            let deletedCount = 0;
            for (const listingId of listingIds) {
                const result = deleteStatement.run(listingId);
                deletedCount += result.changes;
            }
            return deletedCount;
        });
        return transaction();
    }
    /**
     * Deletes all book listings for a specific book
     * @param bookId - The unique identifier of the book whose listings should be deleted
     * @returns {number} The number of deleted listings
     * @throws {Error} If there is a database error during deletion
     */
    deleteBookListingsByBook(bookId) {
        const statement = this.db.prepare('DELETE FROM book_listings WHERE book_id = ?');
        const result = statement.run(bookId);
        return result.changes;
    }
    /**
     * Deletes all book listings for a specific user
     * @param userId - The unique identifier of the user whose listings should be deleted
     * @returns {number} The number of deleted listings
     * @throws {Error} If there is a database error during deletion
     */
    deleteBookListingsByUser(userId) {
        const statement = this.db.prepare('DELETE FROM book_listings WHERE user_id = ?');
        const result = statement.run(userId);
        return result.changes;
    }
    /**
     * Gets the most recent book listings.
     * @param limit The maximum number of listings to return.
     * @returns Array of the most recent book listings.
     */
    getRecentBookListings(limit) {
        const statement = this.db.prepare('SELECT * FROM book_listings ORDER BY list_on_date DESC LIMIT ?');
        return statement.all(limit);
    }
}
