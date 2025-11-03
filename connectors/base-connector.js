/**
 * Base EHR Connector Interface
 * All EHR connectors must implement this interface
 */

class BaseConnector {
    constructor(config) {
        this.config = config || {};
        this.name = 'Base';
        this.isDemo = false;
    }

    /**
     * Initialize the connector (load metadata, authenticate, etc.)
     * @returns {Promise<void>}
     */
    async initialize() {
        throw new Error('initialize() must be implemented by connector');
    }

    /**
     * Search for patients
     * @param {string} query - Search query (name, ID, etc.)
     * @returns {Promise<Array>} Array of patient objects
     */
    async searchPatients(query) {
        throw new Error('searchPatients() must be implemented by connector');
    }

    /**
     * Create a new patient
     * @param {Object} patientData - Patient information
     * @returns {Promise<Object>} Created patient object with UUID
     */
    async createPatient(patientData) {
        throw new Error('createPatient() must be implemented by connector');
    }

    /**
     * Create or get active visit for patient
     * @param {string} patientUuid - Patient UUID
     * @returns {Promise<Object>} Visit object
     */
    async getOrCreateVisit(patientUuid) {
        throw new Error('getOrCreateVisit() must be implemented by connector');
    }

    /**
     * Create an encounter (clinical note)
     * @param {Object} encounterData - Encounter information
     * @returns {Promise<Object>} Created encounter object
     */
    async createEncounter(encounterData) {
        throw new Error('createEncounter() must be implemented by connector');
    }

    /**
     * Add clinical notes to encounter
     * @param {string} encounterId - Encounter UUID
     * @param {string} notes - Clinical notes text
     * @returns {Promise<Object>} Created observation/note object
     */
    async addClinicalNotes(encounterId, notes) {
        throw new Error('addClinicalNotes() must be implemented by connector');
    }

    /**
     * Add diagnosis to encounter
     * @param {string} encounterId - Encounter UUID
     * @param {string} diagnosis - Diagnosis text
     * @returns {Promise<Object>} Created diagnosis object
     */
    async addDiagnosis(encounterId, diagnosis) {
        throw new Error('addDiagnosis() must be implemented by connector');
    }

    /**
     * Get metadata about the connector for display
     * @returns {Object} Metadata (encounter types, locations, etc.)
     */
    getMetadata() {
        return {
            name: this.name,
            encounterType: 'Unknown',
            visitType: 'Unknown',
            location: 'Unknown',
            isDemo: this.isDemo
        };
    }

    /**
     * Get connector display info for UI
     * @returns {Object} Display information
     */
    getInfo() {
        return {
            name: this.name,
            description: 'Base connector',
            requiresAuth: true,
            isDemo: this.isDemo
        };
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseConnector;
}
