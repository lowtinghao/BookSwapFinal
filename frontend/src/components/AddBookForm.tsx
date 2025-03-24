"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface Genre {
  genre_id: number;
  genre_name: string;
}

interface AddBookFormProps {
  token: string | null
  navigateTo: (page: "login" | "signup" | "books" | "addBook" | "exchanges" | "addExchange" | "requests") => void
}

const AddBookForm: React.FC<AddBookFormProps> = ({ token, navigateTo }) => {
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [genreName, setGenreName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [genres, setGenres] = useState<Genre[]>([])

  // Fetch all available genres when component mounts
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch("http://localhost:3001/books/genres", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch genres")
        }

        const data = await response.json()
        setGenres(data)
      } catch (err) {
        console.error("Error fetching genres:", err)
      }
    }

    fetchGenres()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:3001/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          author,
          genre_name: genreName,
          description,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add book")
      }

      // Book added successfully, navigate to books list
      navigateTo("books")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while adding the book")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="form-container">
      <h2>Add New Book</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="author">Author</label>
          <input type="text" id="author" value={author} onChange={(e) => setAuthor(e.target.value)} required />
        </div>
        
        <div className="form-group">
          <label htmlFor="genre">Genre</label>
          <select 
            id="genre" 
            value={genreName} 
            onChange={(e) => setGenreName(e.target.value)} 
            required
          >
            <option value="">Select a genre</option>
            {genres.map((genre) => (
              <option key={genre.genre_id} value={genre.genre_name}>
                {genre.genre_name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? "Adding..." : "Add Book"}
        </button>
      </form>
    </div>
  )
}

export default AddBookForm

