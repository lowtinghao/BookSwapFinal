import Database, { Database as DatabaseType } from 'better-sqlite3';

export class ExchangeRequestNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExchangeRequestNotFoundError';
    }
}

export class CreateExchangeRequestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CreateExchangeRequestError';
    }
}

export class UpdateExchangeRequestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UpdateExchangeRequestError';
    }
}

export interface ExchangeRequest {
    request_id: number;
    requestee_listing_id: number;
    requester_listing_id: number;
    status: string;
    request_date: number;
}

export class ExchangeRequestsDAO {
    private db: DatabaseType;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
    }

    /**
     * Creates a new exchange request in the database.
     * @param exchangeRequest An object containing the exchange request information, excluding the request_id.
     * @returns The newly created exchange request object, including the generated request_id.
     * @throws {CreateExchangeRequestError} If the exchange request creation fails.
     */
    public createExchangeRequest(exchangeRequest: Omit<ExchangeRequest, 'request_id'>): ExchangeRequest {
        const transaction = this.db.transaction(() => {
            // Get both listings directly using SQL to check user IDs
            const getListingStatement = this.db.prepare('SELECT user_id FROM book_listings WHERE listing_id = ?');
            const requesteeListing = getListingStatement.get(exchangeRequest.requestee_listing_id) as { user_id: number } | undefined;
            const requesterListing = getListingStatement.get(exchangeRequest.requester_listing_id) as { user_id: number } | undefined;
            
            // Check if listings exist
            if (!requesteeListing || !requesterListing) {
                throw new CreateExchangeRequestError("One or both listings not found");
            }
            
            // Check if both listings belong to the same user
            if (requesteeListing.user_id === requesterListing.user_id) {
                throw new CreateExchangeRequestError("Cannot create exchange request between listings owned by the same user");
            }
            
            const insertStatement = this.db.prepare(`
                INSERT INTO exchange_requests (
                    requestee_listing_id, requester_listing_id, status, request_date
                ) VALUES (?, ?, ?, ?)
            `);
            
            // Use current Unix time if request_date is null
            const requestDate = exchangeRequest.request_date ?? Math.floor(Date.now() / 1000);
            const result = insertStatement.run(
                exchangeRequest.requestee_listing_id,
                exchangeRequest.requester_listing_id,
                exchangeRequest.status || 'pending',
                requestDate
            );
            
            const requestId = result.lastInsertRowid as number;
            
            // Returns the newly created exchange request
            return this.getExchangeRequestById(requestId);
        });
    
        try {
            return transaction();
        } catch (error: any) {
            if (error instanceof ExchangeRequestNotFoundError) {
                throw new CreateExchangeRequestError(`Failed to retrieve created exchange request. Transaction failed and rolled back.`);
            }
            throw new CreateExchangeRequestError(`Failed to create exchange request: ${error.message}`);
        }
    }

    /**
     * Retrieves an exchange request from the database by its ID.
     * @param requestId The ID of the exchange request to retrieve.
     * @returns The exchange request object if found.
     * @throws {ExchangeRequestNotFoundError} If no exchange request is found with the given ID.
     */
    public getExchangeRequestById(requestId: number): ExchangeRequest {
        const statement = this.db.prepare('SELECT * FROM exchange_requests WHERE request_id = ?');
        const request = statement.get(requestId) as ExchangeRequest | undefined;
        
        if (!request) {
            throw new ExchangeRequestNotFoundError(`Exchange request with ID ${requestId} not found`);
        }
        
        return request;
    }
    
    /**
     * Retrieves all exchange requests from the database.
     * @returns Array of exchange requests.
     */
    public getAllExchangeRequests(): ExchangeRequest[] {
        const statement = this.db.prepare('SELECT * FROM exchange_requests');
        return statement.all() as ExchangeRequest[];
    }
    
    /**
     * Retrieves exchange requests by requestee listing ID.
     * @param listingId The listing ID to filter by.
     * @returns Array of exchange requests for the specified requestee listing.
     */
    public getExchangeRequestsByRequestee(listingId: number): ExchangeRequest[] {
        const statement = this.db.prepare('SELECT * FROM exchange_requests WHERE requestee_listing_id = ?');
        return statement.all(listingId) as ExchangeRequest[];
    }
    
    /**
     * Retrieves exchange requests by requester listing ID.
     * @param listingId The listing ID to filter by.
     * @returns Array of exchange requests for the specified requester listing.
     */
    public getExchangeRequestsByRequester(listingId: number): ExchangeRequest[] {
        const statement = this.db.prepare('SELECT * FROM exchange_requests WHERE requester_listing_id = ?');
        return statement.all(listingId) as ExchangeRequest[];
    }
    
    /**
     * Retrieves exchange requests by user ID (either as requestee or requester).
     * @param userId The user ID to filter by.
     * @returns Array of exchange requests involving the specified user.
     */
    public getExchangeRequestsByUser(userId: number): ExchangeRequest[] {
        const statement = this.db.prepare(`
            SELECT er.* FROM exchange_requests er
            JOIN book_listings bl1 ON er.requestee_listing_id = bl1.listing_id
            JOIN book_listings bl2 ON er.requester_listing_id = bl2.listing_id
            WHERE bl1.user_id = ? OR bl2.user_id = ?
        `);
        return statement.all(userId, userId) as ExchangeRequest[];
    }
    
    /**
     * Retrieves exchange requests by status.
     * @param status The status to filter by (e.g., 'pending', 'accepted', 'rejected').
     * @returns Array of exchange requests with the specified status.
     */
    public getExchangeRequestsByStatus(status: string): ExchangeRequest[] {
        const statement = this.db.prepare('SELECT * FROM exchange_requests WHERE status = ?');
        return statement.all(status) as ExchangeRequest[];
    }
    
    
    /**
     * Updates the status of an exchange request in the database.
     * 
     * @param requestId - The ID of the exchange request to update
     * @param status - The new status to set for the exchange request
     * @returns The updated ExchangeRequest object
     * @throws {UpdateExchangeRequestError} If the request cannot be retrieved after update
     * @throws {Error} If the update operation fails for any other reason
     */
    public updateExchangeRequestStatus(requestId: number, status: string): ExchangeRequest {
        const transaction = this.db.transaction(() => {
            try {
                const statement = this.db.prepare('UPDATE exchange_requests SET status = ? WHERE request_id = ?');
                statement.run(status, requestId);
                
                return this.getExchangeRequestById(requestId);
            } catch (error: any) {
                if (error instanceof ExchangeRequestNotFoundError) {
                    throw new UpdateExchangeRequestError(`Failed to retrieve updated exchange request. Transaction failed and rolled back.`);
                }
                throw new Error(`Failed to update exchange request: ${error.message}`);
            }
        });

        return transaction();
    }

    /**
     * Accepts an exchange request and rejects all other exchange requests for the same requestee listing.
     * 
     * @param requestId - The unique identifier of the exchange request to accept
     * @returns The accepted exchange request
     * @throws {ExchangeRequestNotFoundError} When the exchange request cannot be found
     * @throws {UpdateExchangeRequestError} When the exchange request status cannot be updated
     */
    public acceptExchangeRequest(requestId: number): ExchangeRequest {
        return this.db.transaction(() => {
            // Get the exchange request to accept
            const exchangeRequest = this.getExchangeRequestById(requestId);
            
            // Update the status to 'accepted'
            this.updateExchangeRequestStatus(requestId, 'accepted');
            
            // Get the requestee listing ID
            const requesteeListingId = exchangeRequest.requestee_listing_id;
            
            // Reject all other exchange requests for the same requestee listing
            const updateStatement = this.db.prepare(`
                UPDATE exchange_requests 
                SET status = 'rejected' 
                WHERE requestee_listing_id = ? AND request_id != ?
            `);
            updateStatement.run(requesteeListingId, requestId);
            
            // Return the accepted exchange request
            return this.getExchangeRequestById(requestId);
        })();
    }
    
    /**
     * Retrieves all accepted exchange requests for a specific user.
     * 
     * @param userId - The unique identifier of the user
     * @returns Array of accepted exchange requests where the user is either a requestee or requester
     */
    public getAcceptedExchangeRequestsByUser(userId: number): ExchangeRequest[] {
        const statement = this.db.prepare(`
            SELECT er.* FROM exchange_requests er
            JOIN book_listings bl1 ON er.requestee_listing_id = bl1.listing_id
            JOIN book_listings bl2 ON er.requester_listing_id = bl2.listing_id
            WHERE (bl1.user_id = ? OR bl2.user_id = ?) AND er.status = 'accepted'
        `);
        return statement.all(userId, userId) as ExchangeRequest[];
    }



    /**
     * Updates an exchange request's information in the database.
     * 
     * @param requestId - The unique identifier of the exchange request to update
     * @param updates - Partial exchange request object containing fields to update. Cannot update request_id.
     * @returns Updated exchange request object
     * @throws {UpdateExchangeRequestError} When the exchange request cannot be found after update
     * @throws {Error} When the update operation fails
     */
    public updateExchangeRequest(requestId: number, updates: Partial<Omit<ExchangeRequest, 'request_id'>>): ExchangeRequest {
        const transaction = this.db.transaction(() => {
            try {
                let updateFields = [];
                let updateValues = [];
                
                for (const [key, value] of Object.entries(updates)) {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(value);
                }
                
                if (updateFields.length > 0) {
                    const statement = this.db.prepare(`
                        UPDATE exchange_requests 
                        SET ${updateFields.join(', ')} 
                        WHERE request_id = ?
                    `);
                    
                    statement.run(...updateValues, requestId);
                }
                
                return this.getExchangeRequestById(requestId);
            } catch (error: any) {
                if (error instanceof ExchangeRequestNotFoundError) {
                    throw new UpdateExchangeRequestError(`Failed to retrieve updated exchange request. Transaction failed and rolled back.`);
                }
                throw new Error(`Failed to update exchange request: ${error.message}`);
            }
        });

        return transaction();
    }

    /**
     * Deletes an exchange request from the database based on its ID
     * @param requestId - The unique identifier of the exchange request to delete
     * @returns {boolean} True if the exchange request was successfully deleted, false if the exchange request was not found
     * @throws {Error} If there is a database error during deletion
     */
    public deleteExchangeRequest(requestId: number): boolean {
        const statement = this.db.prepare('DELETE FROM exchange_requests WHERE request_id = ?');
        const result = statement.run(requestId);
        
        return result.changes > 0;
    }
    
    /**
     * Deletes all exchange requests for a specific listing (either as requestee or requester)
     * @param listingId - The unique identifier of the listing whose exchange requests should be deleted
     * @returns {number} The number of deleted exchange requests
     * @throws {Error} If there is a database error during deletion
     */
    public deleteExchangeRequestsByListing(listingId: number): number {
        const statement = this.db.prepare(`
            DELETE FROM exchange_requests 
            WHERE requestee_listing_id = ? OR requester_listing_id = ?
        `);
        const result = statement.run(listingId, listingId);
        
        return result.changes;
    }
    
    /**
     * Checks if an exchange request already exists between two listings
     * @param requesteeListingId - The ID of the requestee's listing
     * @param requesterListingId - The ID of the requester's listing
     * @returns {boolean} True if an exchange request already exists, false otherwise
     */
    public exchangeRequestExists(requesteeListingId: number, requesterListingId: number): boolean {
        const statement = this.db.prepare(`
            SELECT COUNT(*) as count FROM exchange_requests 
            WHERE requestee_listing_id = ? AND requester_listing_id = ?
        `);
        const result = statement.get(requesteeListingId, requesterListingId) as { count: number };
        
        return result.count > 0;
    }
}
