import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { UserService } from './services/UserService.js';
import fs from 'fs';
import cors from 'cors';
import { BookNotFoundError, CreateBookError, UpdateBookError, GenreNotFoundError } from './DAO/BooksDao.js';
import { BookListingNotFoundError, CreateBookListingError, UpdateBookListingError } from './DAO/BookListingsDao.js';
import { AuthService } from './services/AuthService.js';
import { BooksService } from './services/BooksService.js';
import { ExchangeService } from './services/ExchangeService.js';
import { ExchangeRequestsDAO, CreateExchangeRequestError, ExchangeRequestNotFoundError } from './DAO/ExchangeRequestsDao.js';
const databasePath = path.join(process.cwd(), 'database.db');
const sqlFilePath = path.join(process.cwd(), 'src', 'config', 'DatabaseInit.sql');
// Initialize main database
let db;
if (!fs.existsSync(databasePath)) {
    db = new Database(databasePath);
    const initSQL = fs.readFileSync(sqlFilePath, 'utf8');
    db.exec(initSQL);
    console.log('Main database initialized');
}
else {
    db = new Database(databasePath);
    console.log('Main database connected');
}
const authDbPath = path.join(process.cwd(), 'auth.db');
const authSqlFilePath = path.join(process.cwd(), 'src', 'config', 'AuthInit.sql');
const authServiceConfigPath = path.join(process.cwd(), 'src', 'config', 'AuthService.json');
const authServiceConfig = JSON.parse(fs.readFileSync(authServiceConfigPath, 'utf8'));
const JWT_SECRET = authServiceConfig.JWT_KEY;
const userService = new UserService(authDbPath, authSqlFilePath, databasePath, JWT_SECRET);
// Create BooksService instead of direct DAO instances
const booksService = new BooksService(databasePath, sqlFilePath);
// Create an instance of AuthService
const authService = new AuthService(authDbPath, authSqlFilePath, JWT_SECRET);
// Initialize ExchangeService
const exchangeRequestsDao = new ExchangeRequestsDAO(databasePath);
const exchangeService = new ExchangeService(exchangeRequestsDao);
const app = express();
const port = 3001;
// Enable CORS for all routes
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
    res.send('Hello from Express with TypeScript!');
});
app.post('/user/register', async (req, res) => {
    try {
        const user = req.body;
        const userWithToken = await userService.registerUser(user);
        res.status(201).send(userWithToken);
    }
    catch (error) {
        console.log(error.message);
        res.status(400).send(error.message);
    }
});
app.post('/user/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).send('Username and password are required');
            return;
        }
        const userWithToken = await userService.loginUser(username, password);
        res.status(200).send(userWithToken.token);
    }
    catch (error) {
        console.log(error.message);
        res.status(400).send(error.message);
    }
});
// Authentication middleware
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ error: 'Authentication token is required' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const username = authService.verifyToken(token);
        if (!username) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        else {
            req.user = { username }; // Attach user to request
            next();
        }
    }
    catch (error) {
        console.error('Authentication error:', error.message);
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
};
app.get('/user/info', authenticateJWT, (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const userProfile = userService.getUserProfile(req.user.username);
        res.status(200).json(userProfile);
    }
    catch (error) {
        console.error('Error fetching user info:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/books', authenticateJWT, (req, res) => {
    try {
        const bookData = req.body;
        const newBook = booksService.createBook(bookData);
        res.status(201).json(newBook);
    }
    catch (error) {
        console.error('Error creating book:', error.message);
        if (error instanceof CreateBookError) {
            res.status(400).json({ error: error.message });
            return;
        }
        else if (error instanceof GenreNotFoundError) {
            res.status(400).json({ error: "Cant find genre" });
            return;
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
    }
});
app.get('/books', authenticateJWT, (req, res) => {
    try {
        const books = booksService.getAllBooks();
        res.status(200).json(books);
    }
    catch (error) {
        console.error('Error fetching books:', error.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});
app.get('/books/genres', authenticateJWT, (req, res) => {
    try {
        const genres = booksService.getAllGenres();
        res.status(200).json(genres);
    }
    catch (error) {
        console.error('Error fetching genres:', error.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});
app.get('/books/search/title', authenticateJWT, (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) {
            res.status(400).json({ error: 'Search term is required' });
            return;
        }
        const books = booksService.searchBooksByTitle(searchTerm);
        res.status(200).json(books);
        return;
    }
    catch (error) {
        console.error('Error searching books by title:', error.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});
app.get('/books/search/author', authenticateJWT, (req, res) => {
    try {
        const authorName = req.query.q;
        if (!authorName) {
            res.status(400).json({ error: 'Author name is required' });
            return;
        }
        const books = booksService.searchBooksByAuthor(authorName);
        res.status(200).json(books);
        return;
    }
    catch (error) {
        console.error('Error searching books by author:', error.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});
app.get('/books/search/genre', authenticateJWT, (req, res) => {
    try {
        const genre = req.query.q;
        if (!genre) {
            res.status(400).json({ error: 'Genre is required' });
            return;
        }
        const books = booksService.getBooksByGenre(genre);
        res.status(200).json(books);
        return;
    }
    catch (error) {
        console.error('Error searching books by genre:', error.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});
app.get('/books/:id', authenticateJWT, (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        if (isNaN(bookId)) {
            res.status(400).json({ error: 'Invalid book ID' });
            return;
        }
        const book = booksService.getBookById(bookId);
        res.status(200).json(book);
        return;
    }
    catch (error) {
        console.error('Error fetching book:', error.message);
        if (error instanceof BookNotFoundError) {
            res.status(404).json({ error: error.message });
            return;
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
    }
});
app.put('/books/:id', authenticateJWT, (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        if (isNaN(bookId)) {
            res.status(400).json({ error: 'Invalid book ID' });
            return;
        }
        const updates = req.body;
        const updatedBook = booksService.updateBook(bookId, updates);
        res.status(200).json(updatedBook);
        return;
    }
    catch (error) {
        console.error('Error updating book:', error.message);
        if (error instanceof BookNotFoundError || error instanceof UpdateBookError) {
            res.status(404).json({ error: error.message });
            return;
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
    }
});
app.delete('/books/:id', authenticateJWT, (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        if (isNaN(bookId)) {
            res.status(400).json({ error: 'Invalid book ID' });
            return;
        }
        const deleted = booksService.deleteBook(bookId);
        if (deleted) {
            res.status(204).send();
            return;
        }
        else {
            res.status(404).json({ error: 'Book not found' });
            return;
        }
    }
    catch (error) {
        console.error('Error deleting book:', error.message);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});
// Book Listings Routes
app.post('/listings', authenticateJWT, (req, res) => {
    try {
        // Get user ID from username
        console.log(req.body);
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const user = userService.getUserProfile(req.user.username);
        const user_id = user.user_id;
        const listingData = {
            ...req.body,
            user_id
        };
        const newListing = booksService.createBookListing(listingData);
        res.status(201).json(newListing);
    }
    catch (error) {
        console.error('Error creating book listing:', error.message);
        if (error instanceof CreateBookListingError) {
            res.status(400).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
app.get('/listings', authenticateJWT, (req, res) => {
    try {
        const listings = booksService.getAllBookListings();
        res.status(200).json(listings);
    }
    catch (error) {
        console.error('Error fetching book listings:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/listings/:id', authenticateJWT, (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        if (isNaN(listingId)) {
            res.status(400).json({ error: 'Invalid listing ID' });
            return;
        }
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const userProfile = userService.getUserProfile(req.user.username);
        const callerUserId = userProfile.user_id;
        const listing = booksService.getBookListingById(listingId);
        // Gather user IDs from any exchange requests related to this listing
        const requesteeExchanges = exchangeService.getExchangeRequestsForRequestee(listingId);
        const requesterExchanges = exchangeService.getExchangeRequestsForRequester(listingId);
        const requesteeUserIds = requesteeExchanges.map((ex) => booksService.getBookListingById(ex.requestee_listing_id).user_id);
        const requesterUserIds = requesterExchanges.map((ex) => booksService.getBookListingById(ex.requester_listing_id).user_id);
        res.status(200).json({
            listing,
            callerUserId,
            requesteeUserIds,
            requesterUserIds
        });
    }
    catch (error) {
        console.error('Error fetching book listing:', error.message);
        if (error instanceof BookListingNotFoundError) {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
app.get('/listings/user/:userId', authenticateJWT, (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            res.status(400).json({ error: 'Invalid user ID' });
            return;
        }
        const listings = booksService.getBookListingsByUser(userId);
        res.status(200).json(listings);
    }
    catch (error) {
        console.error('Error fetching user book listings:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/listings/book/:bookId', authenticateJWT, (req, res) => {
    try {
        const bookId = parseInt(req.params.bookId);
        if (isNaN(bookId)) {
            res.status(400).json({ error: 'Invalid book ID' });
            return;
        }
        const listings = booksService.getBookListingsByBook(bookId);
        res.status(200).json(listings);
    }
    catch (error) {
        console.error('Error fetching book listings by book:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/listings/recent/:limit', authenticateJWT, (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        const listings = booksService.getRecentBookListings(limit);
        res.status(200).json(listings);
    }
    catch (error) {
        console.error('Error fetching recent book listings:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.put('/listings/:id', authenticateJWT, (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        if (isNaN(listingId)) {
            res.status(400).json({ error: 'Invalid listing ID' });
            return;
        }
        const updates = req.body;
        const updatedListing = booksService.updateBookListing(listingId, updates);
        res.status(200).json(updatedListing);
    }
    catch (error) {
        console.error('Error updating book listing:', error.message);
        if (error instanceof BookListingNotFoundError || error instanceof UpdateBookListingError) {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
app.delete('/listings/:id', authenticateJWT, (req, res) => {
    try {
        const listingId = parseInt(req.params.id);
        if (isNaN(listingId)) {
            res.status(400).json({ error: 'Invalid listing ID' });
            return;
        }
        const deleted = booksService.deleteBookListing(listingId);
        if (deleted) {
            res.status(204).send();
        }
        else {
            res.status(404).json({ error: 'Book listing not found' });
        }
    }
    catch (error) {
        console.error('Error deleting book listing:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.delete('/listings/book/:bookId', authenticateJWT, (req, res) => {
    try {
        const bookId = parseInt(req.params.bookId);
        if (isNaN(bookId)) {
            res.status(400).json({ error: 'Invalid book ID' });
            return;
        }
        const count = booksService.deleteBookListingsByBook(bookId);
        res.status(200).json({ message: `${count} listings deleted successfully` });
    }
    catch (error) {
        console.error('Error deleting book listings by book:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.delete('/listings/user/:userId', authenticateJWT, (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            res.status(400).json({ error: 'Invalid user ID' });
            return;
        }
        const count = booksService.deleteBookListingsByUser(userId);
        res.status(200).json({ message: `${count} listings deleted successfully` });
    }
    catch (error) {
        console.error('Error deleting book listings by user:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Exchange Request Routes
app.post('/exchanges', authenticateJWT, (req, res) => {
    try {
        const { requesteeListingId, requesterListingId } = req.body;
        if (!requesteeListingId || !requesterListingId) {
            res.status(400).json({ error: 'Both requestee and requester listing IDs are required' });
            return;
        }
        const exchangeRequest = exchangeService.createExchangeRequest(parseInt(requesteeListingId), parseInt(requesterListingId));
        res.status(201).json(exchangeRequest);
    }
    catch (error) {
        console.error('Error creating exchange request:', error.message);
        if (error instanceof CreateExchangeRequestError) {
            res.status(400).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
app.get('/exchanges/user', authenticateJWT, (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const user = userService.getUserProfile(req.user.username);
        const exchanges = exchangeService.getExchangeRequestsForUser(user.user_id);
        res.status(200).json(exchanges);
    }
    catch (error) {
        console.error('Error fetching user exchange requests:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/exchanges/requestee/:listingId', authenticateJWT, (req, res) => {
    try {
        const listingId = parseInt(req.params.listingId);
        if (isNaN(listingId)) {
            res.status(400).json({ error: 'Invalid listing ID' });
            return;
        }
        const exchanges = exchangeService.getExchangeRequestsForRequestee(listingId);
        res.status(200).json(exchanges);
    }
    catch (error) {
        console.error('Error fetching exchange requests for listing:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/exchanges/requester/:listingId', authenticateJWT, (req, res) => {
    try {
        const listingId = parseInt(req.params.listingId);
        if (isNaN(listingId)) {
            res.status(400).json({ error: 'Invalid listing ID' });
            return;
        }
        const exchanges = exchangeService.getExchangeRequestsForRequester(listingId);
        res.status(200).json(exchanges);
    }
    catch (error) {
        console.error('Error fetching exchange requests from listing:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/exchanges/:id', authenticateJWT, (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        if (isNaN(requestId)) {
            res.status(400).json({ error: 'Invalid request ID' });
            return;
        }
        // Get the exchange request first
        const exchangeRequest = exchangeService.getExchangeRequestById(requestId);
        // Verify the user making the request is associated with this exchange
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // Get the user from the username
        const user = userService.getUserProfile(req.user.username);
        // Ensure exchangeRequest exists
        if (!exchangeRequest) {
            res.status(404).json({ error: 'Exchange request not found' });
            return;
        }
        // Check if the user is either the requestee or requester
        const requesteeListing = booksService.getBookListingById(exchangeRequest.requestee_listing_id);
        const requesterListing = booksService.getBookListingById(exchangeRequest.requester_listing_id);
        if (requesteeListing.user_id !== user.user_id && requesterListing.user_id !== user.user_id) {
            res.status(403).json({ error: 'Not authorized to view this exchange request' });
            return;
        }
        res.status(200).json(exchangeRequest);
    }
    catch (error) {
        console.error('Error fetching exchange request:', error.message);
        if (error instanceof ExchangeRequestNotFoundError) {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
app.put('/exchanges/:id/accept', authenticateJWT, (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        if (isNaN(requestId)) {
            res.status(400).json({ error: 'Invalid request ID' });
            return;
        }
        // Verify user has permission to accept this exchange
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // Get the exchange request
        const existingRequest = exchangeService.getExchangeRequestById(requestId);
        // Get the user from the username
        const user = userService.getUserProfile(req.user.username);
        // Ensure exchangeRequest exists
        if (!existingRequest) {
            res.status(404).json({ error: 'Exchange request not found' });
            return;
        }
        // Get the requestee's listing
        const requesteeListing = booksService.getBookListingById(existingRequest.requestee_listing_id);
        // Verify that the current user is the requestee (owner of the requested book)
        if (requesteeListing.user_id !== user.user_id) {
            res.status(403).json({ error: 'Only the owner of the requested book can accept an exchange request' });
            return;
        }
        const exchangeRequest = exchangeService.acceptExchangeRequest(requestId);
        // Then remove both book listings since they're now exchanged
        const requesteeListingId = exchangeRequest.requestee_listing_id;
        const requesterListingId = exchangeRequest.requester_listing_id;
        // Delete both listings
        booksService.deleteBookListing(requesteeListingId);
        booksService.deleteBookListing(requesterListingId);
        // Log the exchange completion
        console.log(`Exchange completed between listings ${requesteeListingId} and ${requesterListingId}`);
        res.status(200).json(exchangeRequest);
    }
    catch (error) {
        console.error('Error accepting exchange request:', error.message);
        if (error instanceof ExchangeRequestNotFoundError) {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
app.put('/exchanges/:id/status', authenticateJWT, (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        if (isNaN(requestId)) {
            res.status(400).json({ error: 'Invalid request ID' });
            return;
        }
        const { status } = req.body;
        if (!status || !['pending', 'accepted', 'rejected', 'completed', 'cancelled'].includes(status)) {
            res.status(400).json({ error: 'Valid status is required (pending, accepted, rejected, completed, cancelled)' });
            return;
        }
        const exchangeRequest = exchangeService.updateExchangeRequestStatus(requestId, status);
        res.status(200).json(exchangeRequest);
    }
    catch (error) {
        console.error('Error updating exchange request status:', error.message);
        if (error instanceof ExchangeRequestNotFoundError) {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
app.delete('/exchanges/:id', authenticateJWT, (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        if (isNaN(requestId)) {
            res.status(400).json({ error: 'Invalid request ID' });
            return;
        }
        const deleted = exchangeService.deleteExchangeRequest(requestId);
        if (deleted) {
            res.status(204).send();
        }
        else {
            res.status(404).json({ error: 'Exchange request not found' });
        }
    }
    catch (error) {
        console.error('Error deleting exchange request:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.listen(port, () => {
    console.log("Hello");
    console.log(`Server listening at http://localhost:${port}`);
});
