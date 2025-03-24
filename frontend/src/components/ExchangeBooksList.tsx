"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface BookListing {
  listing_id: number
  book_id: number
  user_id: number
  condition: string
  status: string
  created_at: string
  title: string
  author: string
  genre_name: string
  description: string
  owner: string | null
}

interface ExchangeBooksListProps {
  token: string | null
}

const ExchangeBooksList: React.FC<ExchangeBooksListProps> = ({ token }) => {
  const [listings, setListings] = useState<BookListing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<'all' | 'mine' | 'others'>('all')
  const [username, setUsername] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedRequestedListing, setSelectedRequestedListing] = useState<null | BookListing>(null);
  const [selectedOfferListingId, setSelectedOfferListingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!token) return;

      try {
        const response = await fetch("http://localhost:3001/user/info", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user info");
        }

        const data = await response.json();
        setUsername(data.username);
        
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    };

    fetchUserInfo();
  }, [token]);

  useEffect(() => {
    const fetchListings = async () => {
      if (!token) return

      try {
        const response = await fetch("http://localhost:3001/listings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch book listings")
        }

        const data = await response.json()
        // Log the data to verify structure
        console.log(data)

        // Transform the data into BookListing objects
        const formattedListings = data.map((item: any) => ({
          listing_id: item.listing_id,
          book_id: item.book_id,
          user_id: item.user_id,
          condition: item.condition,
          status: item.status,
          created_at: item.created_at,
          title: item.book.title,
          author: item.book.author,
          genre_name: item.book.genre_name,
          description: item.description,
          owner : item.username
        }));

        setListings(formattedListings)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while fetching listings")
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [token])

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      const response = await fetch(`http://localhost:3001/listings/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete listing');
      }
      setListings(prev => prev.filter(listing => listing.listing_id !== id));
    } catch (err) {
      console.error('Error deleting listing:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting');
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedRequestedListing || !selectedOfferListingId) return;
    try {
      const response = await fetch("http://localhost:3001/exchanges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requesterListingId: selectedOfferListingId,
          requesteeListingId: selectedRequestedListing.listing_id,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create exchange request");
      }
      setShowRequestForm(false);
      setSelectedRequestedListing(null);
      setSelectedOfferListingId(null);
    } catch (err) {
      console.error("Error creating exchange request:", err);
      setError(err instanceof Error ? err.message : "An error occurred while creating exchange request");
    }
  };

  if (isLoading) {
    return <div className="loading">Loading exchange listings...</div>
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>
  }

  const filteredListings = listings.filter(listing => {
    if (filter === 'all') return true;
    if (filter === 'mine') return listing.owner === username;
    return listing.owner !== username;
  });

  return (
    <div className="listings-container">
      <h2>Books Available for Exchange</h2>
      <div className="filter-buttons" style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        margin: '1.5rem 0',
        width: '100%'
      }}>
        <button 
          onClick={() => setFilter('all')}
          style={{
            padding: '0.5rem 1.5rem',
            border: 'none',
            borderRadius: '20px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            backgroundColor: filter === 'all' ? '#2563eb' : '#e5e7eb',
            color: filter === 'all' ? 'white' : '#374151',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontWeight: 500,
          }}
        >
          All Listings
        </button>
        <button 
          onClick={() => setFilter('mine')}
          style={{
            padding: '0.5rem 1.5rem',
            border: 'none',
            borderRadius: '20px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            backgroundColor: filter === 'mine' ? '#2563eb' : '#e5e7eb',
            color: filter === 'mine' ? 'white' : '#374151',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontWeight: 500,
          }}
        >
          My Listings
        </button>
        <button 
          onClick={() => setFilter('others')}
          style={{
            padding: '0.5rem 1.5rem',
            border: 'none',
            borderRadius: '20px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            backgroundColor: filter === 'others' ? '#2563eb' : '#e5e7eb',
            color: filter === 'others' ? 'white' : '#374151',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontWeight: 500,
          }}
        >
          Others' Listings
        </button>
      </div>
      {showRequestForm && (
        <div style={{ margin: '1rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '400px' }}>
          <h3>Request Exchange</h3>
          <form onSubmit={handleRequestSubmit}>
            <label>Select one of your listings to offer:</label>
            <select
              value={selectedOfferListingId || ""}
              onChange={(e) => setSelectedOfferListingId(Number(e.target.value))}
              required
            >
              <option value="" disabled>
                Select your listing
              </option>
              {listings.filter(l => l.owner === username).map(l => (
                <option key={l.listing_id} value={l.listing_id}>
                  {l.title} by {l.author}
                </option>
              ))}
            </select>
            <div style={{ marginTop: '0.5rem' }}>
              <button 
                type="submit" 
                style={{
                  marginRight: '0.5rem',
                  padding: '0.4rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#10B981', 
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
              >
                Submit Request
              </button>
              <button 
                type="button" 
                onClick={() => { setShowRequestForm(false); setSelectedRequestedListing(null); }}
                style={{
                  padding: '0.4rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#6b7280', // nicer gray
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {filteredListings.length === 0 ? (
        <p>No books available for exchange.</p>
      ) : (
        <div className="listings-grid">
          {filteredListings.map((listing) => (
            <div key={listing.listing_id} className="listing-card">
              <h3>{listing.title}</h3>
              <p>
                <strong>Author:</strong> {listing.author}
              </p>
              <p>
                <strong>Genre:</strong> {listing.genre_name}
              </p>
              <p>
                <strong>Description:</strong> {listing.description}
              </p>
              <p>
                <strong>Owner:</strong> {listing.owner}
              </p>
              {listing.owner === username && (
                <button
                  onClick={() => handleDelete(listing.listing_id)}
                  style={{
                    padding: '0.4rem 1rem',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  Delete
                </button>
              )}
              {listing.owner !== username && (
                <button
                  onClick={() => {
                    setSelectedRequestedListing(listing);
                    setShowRequestForm(true);
                  }}
                  style={{
                    padding: '0.4rem 1rem',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  Request
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExchangeBooksList

