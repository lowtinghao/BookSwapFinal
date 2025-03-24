"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface Book {
  book_id: number
  title: string
  author: string
  genre_name: string
  description: string
}

interface BooksListProps {
  token: string | null
}

const BooksList: React.FC<BooksListProps> = ({ token }) => {
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchBooks = async () => {
      if (!token) return

      try {
        const response = await fetch("http://localhost:3001/books", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch books")
        }

        const data = await response.json()
        setBooks(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while fetching books")
      } finally {
        setIsLoading(false)
      }
    }

    fetchBooks()
  }, [token])

  if (isLoading) {
    return <div className="loading">Loading books...</div>
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>
  }

  return (
    <div className="books-container">
      <h2>Available Books</h2>
      {books.length === 0 ? (
        <p>No books available.</p>
      ) : (
        <div className="books-grid">
          {books.map((book) => (
            <div key={book.book_id} className="book-card">
              <h3>{book.title}</h3>
              <p>
                <strong>Author:</strong> {book.author}
              </p>
              <p>
                <strong>Genre:</strong> {book.genre_name}
              </p>
              <p>
                <strong>Description:</strong> {book.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BooksList

