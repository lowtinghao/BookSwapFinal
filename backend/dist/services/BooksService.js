import { BooksDAO } from '../DAO/BooksDao.js';
import { BookListingsDAO } from '../DAO/BookListingsDao.js';
import { UserDAO, } from '../DAO/UserDao.js';
export class BooksService {
    constructor(databasePath, sqlFilePath) {
        this.booksDao = new BooksDAO(databasePath, sqlFilePath);
        this.bookListingsDao = new BookListingsDAO(databasePath, sqlFilePath);
        this.userDao = new UserDAO(databasePath);
    }
    createBook(bookData) {
        return this.booksDao.createBook(bookData);
    }
    getAllBooks() {
        return this.booksDao.getAllBooks();
    }
    searchBooksByTitle(searchTerm) {
        return this.booksDao.searchBooksByTitle(searchTerm);
    }
    searchBooksByAuthor(authorName) {
        return this.booksDao.searchBooksByAuthor(authorName);
    }
    getBooksByGenre(genre) {
        return this.booksDao.getBooksByGenre(genre);
    }
    getBookById(bookId) {
        return this.booksDao.getBookById(bookId);
    }
    updateBook(bookId, updates) {
        return this.booksDao.updateBook(bookId, updates);
    }
    deleteBook(bookId) {
        return this.booksDao.deleteBook(bookId);
    }
    createBookListing(listingData) {
        return this.bookListingsDao.createBookListing(listingData);
    }
    getAllGenres() {
        return this.booksDao.getAllGenres();
    }
    getAllBookListings() {
        const listings = this.bookListingsDao.getAllBookListings();
        const listingsWithBooks = listings.map((listing) => {
            const book = this.booksDao.getBookById(listing.book_id);
            const requester = listing.user_id ? this.userDao.getUserById(listing.user_id) : null;
            const username = requester ? requester.username : null;
            return { ...listing, book, username };
        });
        return listingsWithBooks;
    }
    getBookListingById(listingId) {
        return this.bookListingsDao.getBookListingById(listingId);
    }
    getBookListingsByUser(userId) {
        return this.bookListingsDao.getBookListingsByUser(userId);
    }
    getBookListingsByBook(bookId) {
        return this.bookListingsDao.getBookListingsByBook(bookId);
    }
    getRecentBookListings(limit) {
        return this.bookListingsDao.getRecentBookListings(limit);
    }
    updateBookListing(listingId, updates) {
        return this.bookListingsDao.updateBookListing(listingId, updates);
    }
    deleteBookListing(listingId) {
        return this.bookListingsDao.deleteBookListing(listingId);
    }
    deleteBookListingsByBook(bookId) {
        return this.bookListingsDao.deleteBookListingsByBook(bookId);
    }
    deleteBookListingsByUser(userId) {
        return this.bookListingsDao.deleteBookListingsByUser(userId);
    }
}
