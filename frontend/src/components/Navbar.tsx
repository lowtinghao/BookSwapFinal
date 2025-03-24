"use client"

import type React from "react"

type Page = "login" | "signup" | "books" | "addBook" | "exchanges" | "addExchange" | "requests"

interface NavbarProps {
  currentPage: Page
  navigateTo: (page: Page) => void
  onLogout: () => void
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, navigateTo, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">Book Exchange</div>
      <div className="navbar-links">
        <button className={`nav-link ${currentPage === "books" ? "active" : ""}`} onClick={() => navigateTo("books")}>
          Books
        </button>
        <button
          className={`nav-link ${currentPage === "addBook" ? "active" : ""}`}
          onClick={() => navigateTo("addBook")}
        >
          Add Book
        </button>
        <button
          className={`nav-link ${currentPage === "exchanges" ? "active" : ""}`}
          onClick={() => navigateTo("exchanges")}
        >
          Exchanges
        </button>
        <button
          className={`nav-link ${currentPage === "addExchange" ? "active" : ""}`}
          onClick={() => navigateTo("addExchange")}
        >
          Add Exchange
        </button>
        <button
          className={`nav-link ${currentPage === "requests" ? "active" : ""}`}
          onClick={() => navigateTo("requests")}
        >
          Requests
        </button>
        <button className="nav-link logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  )
}

export default Navbar

