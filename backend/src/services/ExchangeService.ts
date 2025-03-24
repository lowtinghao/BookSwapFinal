import { 
    ExchangeRequestsDAO,
    ExchangeRequest,
    CreateExchangeRequestError
} from '../DAO/ExchangeRequestsDao.js';

export class ExchangeService {
    private exchangeRequestsDao: ExchangeRequestsDAO;

    constructor(exchangeRequestsDao: ExchangeRequestsDAO) {
        this.exchangeRequestsDao = exchangeRequestsDao;
    }

    /**
     * Creates a new exchange request
     * @param requesteeListingId ID of the listing being requested
     * @param requesterListingId ID of the listing offered in exchange
     * @returns The created exchange request
     * @throws {CreateExchangeRequestError} If creation fails
     */
    public createExchangeRequest(requesteeListingId: number, requesterListingId: number): ExchangeRequest {
        try {
            // Check if an exchange request already exists between these listings
            if (this.exchangeRequestsDao.exchangeRequestExists(requesteeListingId, requesterListingId)) {
                throw new CreateExchangeRequestError("An exchange request already exists between these listings");
            }

            // Create the exchange request with pending status and current timestamp
            return this.exchangeRequestsDao.createExchangeRequest({
                requestee_listing_id: requesteeListingId,
                requester_listing_id: requesterListingId,
                status: 'pending',
                request_date: Math.floor(Date.now() / 1000)
            });
        } catch (error) {
            if (error instanceof CreateExchangeRequestError) {
                throw error;
            }
            throw new CreateExchangeRequestError(`Failed to create exchange request: ${(error as Error).message}`);
        }
    }

    /**
     * Deletes an exchange request
     * @param requestId ID of the exchange request to delete
     * @returns A boolean indicating success or failure
     */
    public deleteExchangeRequest(requestId: number): boolean {
        return this.exchangeRequestsDao.deleteExchangeRequest(requestId);
    }

    /**
     * Gets all exchange requests for a specific requestee listing
     * @param listingId ID of the requestee's listing
     * @returns Array of exchange requests for the listing
     */
    public getExchangeRequestsForRequestee(listingId: number): ExchangeRequest[] {
        return this.exchangeRequestsDao.getExchangeRequestsByRequestee(listingId);
    }
    /**
     * Gets an exchange request by its ID
     * @param requestId ID of the exchange request to retrieve
     * @returns The exchange request if found, or undefined if not found
     */
    public getExchangeRequestById(requestId: number): ExchangeRequest | undefined {
        return this.exchangeRequestsDao.getExchangeRequestById(requestId);
    }

    /**
     * Gets all exchange requests from a specific requester listing
     * @param listingId ID of the requester's listing
     * @returns Array of exchange requests from the listing
     */
    public getExchangeRequestsForRequester(listingId: number): ExchangeRequest[] {
        return this.exchangeRequestsDao.getExchangeRequestsByRequester(listingId);
    }

    /**
     * Gets all exchange requests for a specific user (either as requestee or requester)
     * @param userId ID of the user
     * @returns Array of exchange requests involving the user
     */
    public getExchangeRequestsForUser(userId: number): ExchangeRequest[] {
        return this.exchangeRequestsDao.getExchangeRequestsByUser(userId);
    }

    /**
     * Accepts an exchange request and automatically rejects all other requests for the same listing
     * @param requestId ID of the exchange request to accept
     * @returns The accepted exchange request
     */
    public acceptExchangeRequest(requestId: number): ExchangeRequest {
        return this.exchangeRequestsDao.acceptExchangeRequest(requestId);
    }

    /**
     * Updates the status of an exchange request
     * @param requestId ID of the exchange request
     * @param status New status for the request
     * @returns The updated exchange request
     */
    public updateExchangeRequestStatus(requestId: number, status: string): ExchangeRequest {
        return this.exchangeRequestsDao.updateExchangeRequestStatus(requestId, status);
    }

    
}
