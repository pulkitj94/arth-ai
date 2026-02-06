/**
 * Attribution API Client
 * 
 * Centralized API functions for attribution endpoints
 */

const API_BASE_URL = 'http://localhost:3001/api/attribution';

/**
 * Get attribution status
 */
export const getStatus = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/status`);
        if (!response.ok) throw new Error('Failed to fetch status');
        return await response.json();
    } catch (error) {
        console.error('Error fetching attribution status:', error);
        throw error;
    }
};

/**
 * Get platform summary
 */
export const getPlatformSummary = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/summary`);
        if (!response.ok) throw new Error('Failed to fetch platform summary');
        return await response.json();
    } catch (error) {
        console.error('Error fetching platform summary:', error);
        throw error;
    }
};

/**
 * Get campaign details
 * @param {string} platform - Optional platform filter (instagram, facebook, google)
 */
export const getCampaigns = async (platform = null) => {
    try {
        const url = platform
            ? `${API_BASE_URL}/campaigns?platform=${platform}`
            : `${API_BASE_URL}/campaigns`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch campaigns');
        return await response.json();
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        throw error;
    }
};

/**
 * Get budget recommendations
 */
export const getBudgetRecommendations = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/budget-recommendations`);
        if (!response.ok) throw new Error('Failed to fetch budget recommendations');
        return await response.json();
    } catch (error) {
        console.error('Error fetching budget recommendations:', error);
        throw error;
    }
};

/**
 * Get session data (for debugging)
 * @param {number} limit - Maximum number of sessions to return
 */
export const getSessions = async (limit = 100) => {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch sessions');
        return await response.json();
    } catch (error) {
        console.error('Error fetching sessions:', error);
        throw error;
    }
};

/**
 * Trigger attribution calculation
 * @param {Object} options - Calculation options
 * @param {number} options.days - Number of days to look back
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @param {boolean} options.skipBudget - Skip budget optimization
 * @param {boolean} options.clear - Clear existing output files
 */
export const calculateAttribution = async (options = {}) => {
    try {
        const response = await fetch(`${API_BASE_URL}/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(options),
        });

        if (!response.ok) throw new Error('Failed to calculate attribution');
        return await response.json();
    } catch (error) {
        console.error('Error calculating attribution:', error);
        throw error;
    }
};

/**
 * Get all attribution data (summary + campaigns)
 */
export const getAllAttributionData = async () => {
    try {
        const [summary, campaigns, budget] = await Promise.all([
            getPlatformSummary(),
            getCampaigns(),
            getBudgetRecommendations().catch(() => null), // Budget might not exist
        ]);

        return {
            summary: summary.data,
            campaigns: campaigns.data,
            budget: budget?.data || null,
            timestamp: summary.timestamp,
        };
    } catch (error) {
        console.error('Error fetching all attribution data:', error);
        throw error;
    }
};

/**
 * Helper: Check if attribution data exists
 */
export const hasAttributionData = async () => {
    try {
        const status = await getStatus();
        return status.ready || false;
    } catch (error) {
        return false;
    }
};

export default {
    getStatus,
    getPlatformSummary,
    getCampaigns,
    getBudgetRecommendations,
    getSessions,
    calculateAttribution,
    getAllAttributionData,
    hasAttributionData,
};