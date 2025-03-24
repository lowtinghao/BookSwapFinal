import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import * as fs from 'fs';


interface User {
    username: string;
    password: string;
}

class UserExistsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UserExistsError';
    }
}

class FailedToDecodeTokenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FailedToDecodeTokenError';
    }
}

class UserNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UserNotFoundError';
    }
}

class IncorrectPasswordError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IncorrectPasswordError';
    }
}

export class AuthService {
    private JWT_SECRET: string;
    private JWT_EXPIRES_IN: number = 86400; // 24 hours in seconds
    private db: DatabaseType;

    /**
     * Constructor for AuthService
     * @param dbPath Path to the SQLite database
     * @param sqlFilePath Path to SQL initialization file
     * @param JWT_SECRET JWT secret key
     */
    constructor(dbPath: string, sqlFilePath: string, JWT_SECRET: string) {
        // Get JWT secret from environment variables
        this.JWT_SECRET = JWT_SECRET;
        if (!this.JWT_SECRET) {
            console.error('JWT_KEY environment variable not set');
            throw new Error('Unable to initialize authentication service: JWT key not found');
        }

        // Initialize database
        this.db = new Database(dbPath);
        const sql = fs.readFileSync(sqlFilePath).toString();
        this.db.exec(sql);
    }

    /**
     * Register a new user with username and password
     * @param username User's username
     * @param password User's password
     * @returns JWT token if registration successful
     */
    async register(username: string, password: string): Promise<string | null> {
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Start a transaction
        const transaction = this.db.transaction(() => {
            // Check if user already exists
            const statement = this.db.prepare('SELECT * FROM user_auth WHERE username = ?');
            const existingUser = statement.get(username) as User | undefined;

            if (existingUser) {
                throw new UserExistsError(`User with username ${username} already exists`);
            }

            // Insert new user
            const insertStatement = this.db.prepare('INSERT INTO user_auth (username, password) VALUES (?, ?)');
            insertStatement.run(username, hashedPassword);
        });

        try {
            // Execute the transaction
            transaction();
            // Generate and return JWT token
            return this.generateToken(username);
        } catch (error) {
            if (error instanceof UserExistsError) {
                throw error;
            }
            throw new Error(`Registration failed: ${error}`);
        }
    }

    /**
     * Verify JWT token and return username
     * @param token JWT token
     * @returns Username if token is valid, null otherwise
     * @throws FailedToDecodeTokenError if token is invalid
     */
    verifyToken(token: string): string | null {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET) as { username: string };
            return decoded.username;
        } catch (error : any) {
            throw new FailedToDecodeTokenError(`Failed to decode token: ${error.message}`);
        }
    }

    /**
     * Generate JWT token for a user
     * @param username Username
     * @returns JWT token
     */
    private generateToken(username: string): string {
        return jwt.sign({ username }, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRES_IN
        });
    }

    /**
     * Login with username and password
     * @param username User's username
     * @param password User's password
     * @returns JWT token if credentials are valid
     * @throws UserNotFoundError if user not found
     * @throws IncorrectPasswordError if password is incorrect
     */
    async login(username: string, password: string): Promise<string | null> {
        const findUserStatement = this.db.prepare('SELECT * FROM user_auth WHERE username = ?');
        const user = findUserStatement.get(username) as User | undefined;

        if (!user) {
            throw new UserNotFoundError(`User with username ${username} not found`);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            throw new IncorrectPasswordError('Incorrect password');
        }

        return this.generateToken(username);
    }
    
    /**
     * Close the database connection when done
     */
    close(): void {
        this.db.close();
    }
}
