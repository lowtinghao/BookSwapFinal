import Database from 'better-sqlite3';
export class UserNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UserNotFoundError';
    }
}
export class SetGenresError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SetGenresError';
    }
}
export class UpdateUserError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UpdateUserError';
    }
}
export class UserDAO {
    constructor(dbPath) {
        this.db = new Database(dbPath);
    }
    /**
     * Creates a new user in the database.
     * @param user An object containing the user's information, excluding the user_id.
     *             The `preferred_genres` property is optional.
     * @returns The newly created user object, including the generated user_id and populated preferred_genres.
     * @throws {Error} If the user creation fails, including database errors or failure to retrieve the created user.
     */
    createUser(user) {
        const transaction = this.db.transaction(() => {
            const insertUserStatement = this.db.prepare(`
                INSERT INTO users (
                    username, first_name, last_name, email, profile_picture_url, 
                    location, bio, date_joined
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const result = insertUserStatement.run(user.username, user.first_name, user.last_name, user.email, user.profile_picture_url || null, user.location || null, user.bio || null, user.date_joined);
            const userId = result.lastInsertRowid;
            if (user.preferred_genres && user.preferred_genres.length > 0) {
                this.setUserGenres(userId, user.preferred_genres);
            }
            // Returns the newly created user
            return this.getUserById(userId);
        });
        try {
            return transaction();
        }
        catch (error) {
            if (error instanceof UserNotFoundError) {
                throw new Error(`Failed to retrieve created user. Transaction failed and rolled back.`);
            }
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }
    /**
     * Retrieves a user from the database by their user ID.
     * @param userId The ID of the user to retrieve.
     * @returns The user object if found.
     * @throws {UserNotFoundError} If no user is found with the given ID.
     */
    getUserById(userId) {
        const statement = this.db.prepare('SELECT * FROM users WHERE user_id = ?');
        const user = statement.get(userId);
        if (!user) {
            throw new UserNotFoundError(`User with ID ${userId} not found`);
        }
        ;
        user.preferred_genres = this.getUserGenres(userId);
        return user;
    }
    /**
     * Retrieves a user from the database by their username.
     * @param {string} username The username of the user to retrieve.
     * @returns {User} The user object.
     * @throws {UserNotFoundError} If no user is found with the given username.
     */
    getUserByUsername(username) {
        const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
        const user = stmt.get(username);
        if (!user) {
            throw new UserNotFoundError(`User with username ${username} not found`);
        }
        ;
        user.preferred_genres = this.getUserGenres(user.user_id);
        return user;
    }
    /**
     * Retrieves a user from the database by their email address.
     * @param {string} email - The email address of the user to retrieve.
     * @returns {User} The user object if found.
     * @throws {UserNotFoundError} If no user is found with the given email.
     */
    getUserByEmail(email) {
        const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
        const user = stmt.get(email);
        if (!user) {
            throw new UserNotFoundError(`User with email ${email} not found`);
        }
        ;
        user.preferred_genres = this.getUserGenres(user.user_id);
        return user;
    }
    /**
     * Updates a user's information in the database.
     *
     * @param userId - The unique identifier of the user to update
     * @param updates - Partial user object containing fields to update. Cannot update user_id.
     * @returns Updated user object
     * @throws {UpdateUserError} When the user cannot be found after update
     * @throws {Error} When the update operation fails
     */
    updateUser(userId, updates) {
        const transaction = this.db.transaction(() => {
            try {
                let updateFields = [];
                let updateValues = [];
                for (const [key, value] of Object.entries(updates)) {
                    if (key === 'preferred_genres')
                        continue;
                    updateFields.push(`${key} = ?`);
                    updateValues.push(value);
                }
                if (updateFields.length > 0) {
                    const statement = this.db.prepare(`
                        UPDATE users 
                        SET ${updateFields.join(', ')} 
                        WHERE user_id = ?
                    `);
                    statement.run(...updateValues, userId);
                }
                if (updates.preferred_genres) {
                    this.setUserGenres(userId, updates.preferred_genres);
                }
                return this.getUserById(userId);
            }
            catch (error) {
                if (error instanceof UserNotFoundError) {
                    throw new UpdateUserError(`Failed to retrieve updated user. Transaction failed and rolled back.`);
                }
                throw new Error(`Failed to update user: ${error.message}`);
            }
        });
        return transaction();
    }
    /**
     * Deletes a user from the database based on their user ID
     * @param userId - The unique identifier of the user to delete
     * @returns {boolean} True if the user was successfully deleted, false if the user was not found
     * @throws {Error} If there is a database error during deletion
     */
    deleteUser(userId) {
        const statement = this.db.prepare('DELETE FROM users WHERE user_id = ?');
        const result = statement.run(userId);
        return result.changes > 0;
    }
    /**
     * Retrieves an array of genre names associated with a specific user.
     * @param userId - The unique identifier of the user
     * @returns An array of genre names as strings that the user is interested in
     * @private
     */
    getUserGenres(userId) {
        const statement = this.db.prepare(`
            SELECT g.genre_name 
            FROM genres g
            JOIN user_genres ug ON g.genre_id = ug.genre_id
            WHERE ug.user_id = ?
        `);
        const genres = statement.all(userId);
        return genres.map(g => g.genre_name);
    }
    /**
     * Updates the genres associated with a user in the database.
     * First removes all existing genre associations for the user, then adds the new ones.
     * If genres array is empty, only deletion is performed.
     *
     * @param userId - The unique identifier of the user whose genres are being updated
     * @param genres - Array of genre names to associate with the user
     * @throws {SetGenresError} When there's an error setting the genres in the database
     * @void
     */
    setUserGenres(userId, genres) {
        const setGenreTransaction = this.db.transaction((userId, genres) => {
            try {
                const deleteStatement = this.db.prepare('DELETE FROM user_genres WHERE user_id = ?');
                deleteStatement.run(userId);
                if (genres.length == 0)
                    return;
                const insertStatement = this.db.prepare(`
                    INSERT INTO user_genres (user_id, genre_id)
                    SELECT ?, genre_id FROM genres WHERE genre_name = ?
                `);
                for (const genre of genres) {
                    const result = insertStatement.run(userId, genre);
                    if (result.changes === 0) {
                        throw new SetGenresError(`Genre "${genre}" not found.`);
                    }
                }
                ;
            }
            catch (error) {
                throw new SetGenresError(`${error.message}`);
            }
        });
        setGenreTransaction(userId, genres);
    }
}
