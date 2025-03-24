# BookSwap - POC

## Overview

This project is a Proof of Concept (POC) for a Peer-to-Peer (P2P) Book Exchange Platform. The goal is to provide a convenient and community-driven platform for users to list, search, and exchange physical books. This platform aims to give books a second life, promote sustainability, and foster a community of readers.

## Key Features (MVP)

* **User Authentication:** Basic user registration and login functionality.
* **Book Listing:** Users can add book details (title, author, genre, description, image).
* **Book Search:** Search functionality based on title, author, or genre.
* **Exchange Request:** A mechanism for users to request book exchanges.
* **User Profiles:** Basic user profiles with listed books.
* **User Ratings:** User reviews and ratings.
* **Book Recommendations:** Book recommendations based on user preferences.

## Tech Stack
* **Backend:**
    * Node.js with Express.js
    * PostgreSQL
* **Frontend:**
    * React.js
    * HTML/CSS/JavaScript
* **Tools:**
    * Git/GitHub
    * npm or yarn
    * Docker
 
## Roadmap
* **User Authentication**
   * Create User Database Models [DONE]
   * Implement Endpoints for user registration/login [DONE]
   * Implement Authentication [DONE]
* **Book Listings**
   * Create Book & Book Listings Database Models [DONE]
   * Implement Endpoints for adding book listings [DONE]
* **Book Search**
   * Implement Endpoints for searching book listings by title, author, or genre. [DONE]
* **Exchange Requests**
   * Create Exchange Requests Database Models [DONE]
   * Implement Endpoints for creating an exchange request [DONE]
   * Implement Endpoints for accepting an exchange request [DONE]

* **User Profiles**
   * Implement Endpoint for editing user info
* **User Ratings**
   * Implement Endpoint for rating each exchange history
   * Implement Endpoint for getting ratings for each user
* **Book Recommendations**
   * Implement book ranking algorithm
   * Implement Endpoint for getting book rankings

 # Starting POC
 ## Starting Backend Service
 * Enter backend directory `cd backend`
 * Install dependancies `npm install`
 * Start development server `npm run dev`

 ## Starting Frontend Service
 * Enter frontend directory `cd frontend`
 * Install dependancies `npm install`
 * Start development server `npm run dev`

 * The POC website can be accessed at localhost:3000
