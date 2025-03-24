"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface Book {
  book_id: number
  title: string
  author: string
}

interface AddExchangeBookFormProps {
  token: string | null
  navigateTo: (page: "login" | "signup" | "books" | "addBook" | "exchanges" | "addExchange" | "requests") => void
}

const AddExchangeBookForm: React.FC<AddExchangeBookFormProps> = ({ token, navigateTo }) => {
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBookId, setSelectedBookId] = useState<number | "">("")
  const [condition, setCondition] = useState("Good")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingBooks, setIsFetchingBooks] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [description, setDescription] = useState("")

  useEffect(() => {
    const searchBooks = async () => {
      if (!token || !searchTerm) {
        setBooks([])
        return
      }

      setIsFetchingBooks(true)
      try {
        const response = await fetch(`http://localhost:3001/books/search/title?q=${encodeURIComponent(searchTerm)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to search books")
        }

        const data = await response.json()
        setBooks(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while searching books")
      } finally {
        setIsFetchingBooks(false)
      }
    }

    const debounceTimeout = setTimeout(searchBooks, 300)
    return () => clearTimeout(debounceTimeout)
  }, [searchTerm, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || selectedBookId === "") return

    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:3001/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          book_id: selectedBookId,
          condition,
          status: "available",
          description,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add book for exchange")
      }

      // Book listing added successfully, navigate to exchanges list
      navigateTo("exchanges")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while adding the book for exchange")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="form-container">
      <h2>Add Book for Exchange</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="search">Search Books</label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search books..."
            className="search-input"
            onFocus={() => setIsOpen(true)}
          />
          {isOpen && books.length > 0 && (
            <ul
              className="autocomplete-list"
              style={{
                position: "absolute",
                zIndex: 999,
                background: "#fff",
                width: "auto",
                maxWidth: "100%",
                border: "1px solid #ccc",
                marginTop: 0,
                padding: 0
              }}
            >
              {books.map((book) => (
                <li
                  key={book.book_id}
                  style={{ listStyle: "none", padding: "8px", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  onClick={() => {
                    setSelectedBookId(book.book_id)
                    setSearchTerm(book.title)
                    setIsOpen(false)
                  }}
                >
                  {book.title} by {book.author}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a short description..."
          />
        </div>
        <button type="submit" className="btn-primary" disabled={isLoading || selectedBookId === ""}>
          {isLoading ? "Adding..." : "Add for Exchange"}
        </button>
      </form>
    </div>
  )
}

export default AddExchangeBookForm

