import { User, UserDAO, UserNotFoundError } from '../DAO/UserDao.js';
import { AuthService } from './AuthService.js';
import path from 'path';

// Custom errors for better error handling
export class UserRegistrationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UserRegistrationError';
    }
}

export class UserLoginError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UserLoginError';
    }
}

export interface UserWithToken {
    user: User;
    token: string;
}

export class UserService {
    private authService: AuthService;
    private userDao: UserDAO;
    
    constructor(authDbPath: string, authSqlFilePath: string, userDaoPath: string, JWT_SECRET: string) {
        this.authService = new AuthService(authDbPath, authSqlFilePath, JWT_SECRET);
        this.userDao = new UserDAO(userDaoPath);
    }
    
    /**
     * Registers a new user by creating both authentication and profile entries
     * @param userData User data including username, password, and profile information
     * @returns Object containing the user profile and JWT token
     */
    public async registerUser(userData: User & { password: string }): Promise<UserWithToken> {
        let createdUser: User | null = null;
        
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
                
            } catch (authError: any) {
                // If any auth error occurs, rollback user creation
                if (createdUser) {
                    try {
                        this.userDao.deleteUser(createdUser.user_id);
                    } catch (Error) {
                        console.error('Failed to rollback user creation:', Error);
                    }
                }
                throw authError; // Re-throw to be caught by outer catch
            }
        } catch (error: any) {
            // Make sure we attempt rollback for any other errors too
            if (createdUser && error.name !== 'UserRegistrationError') { 
                // If we haven't already tried to rollback
                try {
                    this.userDao.deleteUser(createdUser.user_id);
                } catch (rollbackError) {
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
    public async loginUser(username: string, password: string): Promise<UserWithToken> {
        try {
            // Authenticate the user
            const token = await this.authService.login(username, password);
            
            if (!token) {
                throw new UserLoginError('Invalid credentials');
            }
            
            // Get the user profile
            const user = this.userDao.getUserByUsername(username);
            
            return { user, token };
        } catch (error: any) {
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
    public getUserProfile(username: string): User {
        try {
            return this.userDao.getUserByUsername(username);
        } catch (error: any) {
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
    public getUserFromToken(token: string): User {
        const username = this.authService.verifyToken(token);
        
        if (!username) {
            throw new Error('Invalid or expired token');
        }
        
        return this.getUserProfile(username);
    }
}
