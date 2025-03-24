import { 
  BooksDAO, 
  Book,
  BookCreationData
} from '../DAO/BooksDao.js';
import { 
  BookListingsDAO, 
  BookListing
} from '../DAO/BookListingsDao.js';
import { 
  User,
  UserDAO, 
} from '../DAO/UserDao.js';

export class BooksService {
  private booksDao: BooksDAO;
  private bookListingsDao: BookListingsDAO;
  private userDao: UserDAO;

  constructor(databasePath: string, sqlFilePath: string) {
    this.booksDao = new BooksDAO(databasePath, sqlFilePath);
    this.bookListingsDao = new BookListingsDAO(databasePath, sqlFilePath);
    this.userDao = new UserDAO(databasePath);
  }


  createBook(bookData: Omit<BookCreationData, 'book_id'>) {
    return this.booksDao.createBook(bookData);
  }

  getAllBooks() {
    return this.booksDao.getAllBooks();
  }

  searchBooksByTitle(searchTerm: string) {
    return this.booksDao.searchBooksByTitle(searchTerm);
  }

  searchBooksByAuthor(authorName: string) {
    return this.booksDao.searchBooksByAuthor(authorName);
  }


  getBooksByGenre(genre: string) {
    return this.booksDao.getBooksByGenre(genre);
  }

  getBookById(bookId: number) {
    return this.booksDao.getBookById(bookId);
  }

  updateBook(bookId: number, updates: Partial<Omit<Book, 'book_id'>>) {
    return this.booksDao.updateBook(bookId, updates);
  }

  deleteBook(bookId: number) {
    return this.booksDao.deleteBook(bookId);
  }


  createBookListing(listingData: Omit<BookListing, 'listing_id'>) {
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

  getBookListingById(listingId: number) {
    return this.bookListingsDao.getBookListingById(listingId);
  }

  getBookListingsByUser(userId: number) {
    return this.bookListingsDao.getBookListingsByUser(userId);
  }

  getBookListingsByBook(bookId: number) {
    return this.bookListingsDao.getBookListingsByBook(bookId);
  }

  getRecentBookListings(limit: number) {
    return this.bookListingsDao.getRecentBookListings(limit);
  }

  updateBookListing(listingId: number, updates: Partial<Omit<BookListing, 'listing_id'>>) {
    return this.bookListingsDao.updateBookListing(listingId, updates);
  }

  deleteBookListing(listingId: number) {
    return this.bookListingsDao.deleteBookListing(listingId);
  }

  deleteBookListingsByBook(bookId: number) {
    return this.bookListingsDao.deleteBookListingsByBook(bookId);
  }

  deleteBookListingsByUser(userId: number) {
    return this.bookListingsDao.deleteBookListingsByUser(userId);
  }
}
