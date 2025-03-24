import { CreateExchangeRequestError } from '../DAO/ExchangeRequestsDao.js';
export class ExchangeService {
    constructor(exchangeRequestsDao) {
        this.exchangeRequestsDao = exchangeRequestsDao;
    }
    /**
     * Creates a new exchange request
     * @param requesteeListingId ID of the listing being requested
     * @param requesterListingId ID of the listing offered in exchange
     * @returns The created exchange request
     * @throws {CreateExchangeRequestError} If creation fails
     */
    createExchangeRequest(requesteeListingId, requesterListingId) {
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
        }
        catch (error) {
            if (error instanceof CreateExchangeRequestError) {
                throw error;
            }
            throw new CreateExchangeRequestError(`Failed to create exchange request: ${error.message}`);
        }
    }
    /**
     * Deletes an exchange request
     * @param requestId ID of the exchange request to delete
     * @returns A boolean indicating success or failure
     */
    deleteExchangeRequest(requestId) {
        return this.exchangeRequestsDao.deleteExchangeRequest(requestId);
    }
    /**
     * Gets all exchange requests for a specific requestee listing
     * @param listingId ID of the requestee's listing
     * @returns Array of exchange requests for the listing
     */
    getExchangeRequestsForRequestee(listingId) {
        return this.exchangeRequestsDao.getExchangeRequestsByRequestee(listingId);
    }
    /**
     * Gets an exchange request by its ID
     * @param requestId ID of the exchange request to retrieve
     * @returns The exchange request if found, or undefined if not found
     */
    getExchangeRequestById(requestId) {
        return this.exchangeRequestsDao.getExchangeRequestById(requestId);
    }
    /**
     * Gets all exchange requests from a specific requester listing
     * @param listingId ID of the requester's listing
     * @returns Array of exchange requests from the listing
     */
    getExchangeRequestsForRequester(listingId) {
        return this.exchangeRequestsDao.getExchangeRequestsByRequester(listingId);
    }
    /**
     * Gets all exchange requests for a specific user (either as requestee or requester)
     * @param userId ID of the user
     * @returns Array of exchange requests involving the user
     */
    getExchangeRequestsForUser(userId) {
        return this.exchangeRequestsDao.getExchangeRequestsByUser(userId);
    }
    /**
     * Accepts an exchange request and automatically rejects all other requests for the same listing
     * @param requestId ID of the exchange request to accept
     * @returns The accepted exchange request
     */
    acceptExchangeRequest(requestId) {
        return this.exchangeRequestsDao.acceptExchangeRequest(requestId);
    }
    /**
     * Updates the status of an exchange request
     * @param requestId ID of the exchange request
     * @param status New status for the request
     * @returns The updated exchange request
     */
    updateExchangeRequestStatus(requestId, status) {
        return this.exchangeRequestsDao.updateExchangeRequestStatus(requestId, status);
    }
}
