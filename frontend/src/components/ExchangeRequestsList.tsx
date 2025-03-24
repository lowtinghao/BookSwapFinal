"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface ExchangeRequest {
  request_id: number
  requestee_listing_id: number
  requester_listing_id: number
  status: string
  created_at: string
  requestee_book_title: string
  requester_book_title: string
  requesteeUserId: number
  requesterUserId: number
  callerUserId: number
}

interface ExchangeRequestsListProps {
  token: string | null
}

const ExchangeRequestsList: React.FC<ExchangeRequestsListProps> = ({ token }) => {
  const [requests, setRequests] = useState<ExchangeRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchRequests = async () => {
    if (!token) return

    try {
      const response = await fetch("http://localhost:3001/exchanges/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch exchange requests")
      }

      const data = await response.json()

      const enhancedData = await Promise.all(
        data.map(async (request: any) => {
          const requesteeListingResponse = await fetch(
            `http://localhost:3001/listings/${request.requestee_listing_id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          )

          const requesterListingResponse = await fetch(
            `http://localhost:3001/listings/${request.requester_listing_id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          )

          
          if (!requesteeListingResponse.ok || !requesterListingResponse.ok) {
            return {
              ...request,
              requestee_book_title: "Unknown Book",
              requester_book_title: "Unknown Book",
            }
          }

          const requesteeListing = await requesteeListingResponse.json()
          const requesterListing = await requesterListingResponse.json()

          console.log(requesteeListing)
          const requesteeUserId = requesteeListing.requesteeUserIds[0]
          const requesterUserId = requesterListing.requesterUserIds[0]
          const callerUserId = requesteeListing.callerUserId
          

          const requesteeBookId = requesteeListing.listing.book_id
          const requesterBookId = requesterListing.listing.book_id

          // fetch book details from '/books/:id'
          const bookRequesteeResponse = await fetch(
            `http://localhost:3001/books/${requesteeBookId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          )
          const bookRequesterResponse = await fetch(
            `http://localhost:3001/books/${requesterBookId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          )

          if (!bookRequesteeResponse.ok || !bookRequesterResponse.ok) {
            return {
              ...request,
              requestee_book_title: "Unknown Book",
              requester_book_title: "Unknown Book",
            }
          }

          const requesteeBook = await bookRequesteeResponse.json()
          const requesterBook = await bookRequesterResponse.json()
         

          return {
            ...request,
            requestee_book_title: requesteeBook.title,
            requester_book_title: requesterBook.title,
            requesteeUserId,
            requesterUserId,
            callerUserId
          }
        }),
      )
      console.log(enhancedData)
      setRequests(enhancedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching exchange requests")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [token])

  const handleAcceptRequest = async (requestId: number) => {
    if (!token) return

    try {
      const response = await fetch(`http://localhost:3001/exchanges/${requestId}/accept`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to accept exchange request")
      }

      // Refresh the requests list
      fetchRequests()
      console.log(requests)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while accepting the exchange request")
    }
  }

  if (isLoading) {
    return <div className="loading">Loading exchange requests...</div>
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>
  }

  return (
    <div className="requests-container">
      <h2>Exchange Requests</h2>
      {requests.length === 0 ? (
        <p>No exchange requests available.</p>
      ) : (
        <div className="requests-list">
          {requests.map((request) => {
            console.log("caller:", request.callerUserId, "requestee:", request.requesteeUserId)
            return (
              <div key={request.request_id} className="request-card">
                <h3>Exchange Request #{request.request_id}</h3>
                <p>
                  <strong>Requested Book:</strong> {request.requestee_book_title}
                </p>
                <p>
                  <strong>Offered Book:</strong> {request.requester_book_title}
                </p>
                <p>
                  <strong>Status:</strong> {request.status}
                </p>

                {request.status === "pending" && request.callerUserId === request.requesteeUserId && (
                  <button className="btn-accept" onClick={() => handleAcceptRequest(request.request_id)}>
                    Accept Exchange
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ExchangeRequestsList

