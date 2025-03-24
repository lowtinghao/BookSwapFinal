"use client"

import type React from "react"
import { useState, useEffect } from "react"
import SignupPage from "./components/SignupPage"
import LoginPage from "./components/LoginPage"
import BooksList from "./components/BooksList"
import AddBookForm from "./components/AddBookForm"
import ExchangeBooksList from "./components/ExchangeBooksList"
import AddExchangeBookForm from "./components/AddExchangeBookForm"
import ExchangeRequestsList from "./components/ExchangeRequestsList"
import Navbar from "./components/Navbar"
import "./App.css"

// Define the pages we can navigate to
type Page = "login" | "signup" | "books" | "addBook" | "exchanges" | "addExchange" | "requests"

const App: React.FC = () => {
  // State to track which page to display
  const [currentPage, setCurrentPage] = useState<Page>("login")
  // State to store the authentication token
  const [token, setToken] = useState<string | null>(null)

  // Check if user is already logged in on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (storedToken) {
      setToken(storedToken)
      setCurrentPage("books")
    }
  }, [])

  // Function to handle login
  const handleLogin = (newToken: string) => {
    setToken(newToken)
    localStorage.setItem("token", newToken)
    setCurrentPage("books")
  }

  // Function to handle logout
  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem("token")
    setCurrentPage("login")
  }

  // Function to navigate between pages
  const navigateTo = (page: Page) => {
    setCurrentPage(page)
  }

  // Render the appropriate component based on currentPage
  const renderPage = () => {
    if (!token && currentPage !== "login" && currentPage !== "signup") {
      return <LoginPage onLogin={handleLogin} navigateTo={navigateTo} />
    }

    switch (currentPage) {
      case "login":
        return <LoginPage onLogin={handleLogin} navigateTo={navigateTo} />
      case "signup":
        return <SignupPage navigateTo={navigateTo} />
      case "books":
        return <BooksList token={token} />
      case "addBook":
        return <AddBookForm token={token} navigateTo={navigateTo} />
      case "exchanges":
        return <ExchangeBooksList token={token} />
      case "addExchange":
        return <AddExchangeBookForm token={token} navigateTo={navigateTo} />
      case "requests":
        return <ExchangeRequestsList token={token} />
      default:
        return <LoginPage onLogin={handleLogin} navigateTo={navigateTo} />
    }
  }

  return (
    <div className="app">
      {token && <Navbar currentPage={currentPage} navigateTo={navigateTo} onLogout={handleLogout} />}
      <main className="content">{renderPage()}</main>
    </div>
  )
}

export default App

