import { UserDAO, UserNotFoundError } from '../DAO/UserDao.js';
import { AuthService } from './AuthService.js';
// Custom errors for better error handling
export class UserRegistrationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UserRegistrationError';
    }
}
export class UserLoginError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UserLoginError';
    }
}
export class UserService {
    constructor(authDbPath, authSqlFilePath, userDaoPath, JWT_SECRET) {
        this.authService = new AuthService(authDbPath, authSqlFilePath, JWT_SECRET);
        this.userDao = new UserDAO(userDaoPath);
    }
    /**
     * Registers a new user by creating both authentication and profile entries
     * @param userData User data including username, password, and profile information
     * @returns Object containing the user profile and JWT token
     */
    async registerUser(userData) {
        let createdUser = null;
        try {
            const { password, ...userProfileData } = userData;
            if (!userProfileData.date_joined) {
                userProfileData.date_joined = Math.floor(Date.now() / 1000);
            }
            createdUser = this.userDao.createUser(userProfileData);
            try {
                const token = await this.authService.register(userData.username, password);
                if (!token) {
                    // If authentication registration fails, rollback user creation
                    if (createdUser) {
                        this.userDao.deleteUser(createdUser.user_id);
                    }
                    throw new UserRegistrationError('Failed to generate authentication token');
                }
                return { user: createdUser, token };
            }
            catch (authError) {
                // If any auth error occurs, rollback user creation
                if (createdUser) {
                    try {
                        this.userDao.deleteUser(createdUser.user_id);
                    }
                    catch (Error) {
                        console.error('Failed to rollback user creation:', Error);
                    }
                }
                throw authError; // Re-throw to be caught by outer catch
            }
        }
        catch (error) {
            // Make sure we attempt rollback for any other errors too
            if (createdUser && error.name !== 'UserRegistrationError') {
                // If we haven't already tried to rollback
                try {
                    this.userDao.deleteUser(createdUser.user_id);
                }
                catch (rollbackError) {
                    console.error('Failed to rollback user creation:', rollbackError);
                }
            }
            if (error.name === 'UserExistsError') {
                throw new UserRegistrationError(`Registration failed: ${error.message}`);
            }
            // If it's already a UserRegistrationError, just rethrow it
            if (error instanceof UserRegistrationError) {
                throw error;
            }
            throw new UserRegistrationError(`Failed to register user: ${error.message}`);
        }
    }
    /**
     * Logs in a user using their credentials
     * @param username User's username
     * @param password User's password
     * @returns Object containing the user profile and JWT token
     */
    async loginUser(username, password) {
        try {
            // Authenticate the user
            const token = await this.authService.login(username, password);
            if (!token) {
                throw new UserLoginError('Invalid credentials');
            }
            // Get the user profile
            const user = this.userDao.getUserByUsername(username);
            return { user, token };
        }
        catch (error) {
            if (error.name === 'UserNotFoundError') {
                throw new UserLoginError('Invalid credentials');
            }
            throw new UserLoginError(`Login failed: ${error.message}`);
        }
    }
    /**
     * Gets user profile by username
     * @param username Username to look up
     * @returns User profile
     */
    getUserProfile(username) {
        try {
            return this.userDao.getUserByUsername(username);
        }
        catch (error) {
            if (error instanceof UserNotFoundError) {
                throw error;
            }
            throw new Error(`Failed to get user profile: ${error.message}`);
        }
    }
    /**
     * Verifies a JWT token and returns the corresponding user
     * @param token JWT token
     * @returns User profile if token is valid
     */
    getUserFromToken(token) {
        const username = this.authService.verifyToken(token);
        if (!username) {
            throw new Error('Invalid or expired token');
        }
        return this.getUserProfile(username);
    }
}
