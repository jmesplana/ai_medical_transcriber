/**
 * OpenMRS EHR Connector
 * Connects to OpenMRS instances via REST API
 */

class OpenMRSConnector extends BaseConnector {
    constructor(config) {
        super(config);
        this.name = 'OpenMRS';
        this.isDemo = false;

        // Configuration
        this.baseUrl = config.baseUrl || 'https://dev3.openmrs.org/openmrs';
        this.username = config.username || 'admin';
        this.password = config.password || 'Admin123';
        this.useProxy = config.useProxy !== false; // Default to true
        this.proxyPath = config.proxyPath || '/openmrs-proxy';

        // Metadata storage
        this.encounterTypeUUID = null;
        this.encounterTypeName = null;
        this.locationUUID = null;
        this.locationName = null;
        this.visitTypeUUID = null;
        this.visitTypeName = null;
        this.clinicalNotesConceptUUID = null;
        this.diagnosisConceptUUID = null;
    }

    async initialize() {
        console.log('🏥 Initializing OpenMRS connector...');

        try {
            await Promise.all([
                this._loadEncounterTypes(),
                this._loadLocations(),
                this._loadVisitTypes(),
                this._loadConcepts()
            ]);

            console.log('✅ OpenMRS connector initialized successfully');
        } catch (error) {
            console.error('❌ OpenMRS initialization failed:', error);
            throw new Error(`Failed to initialize OpenMRS: ${error.message}`);
        }
    }

    async searchPatients(query) {
        const url = this._buildUrl(`/ws/rest/v1/patient?q=${encodeURIComponent(query)}`);
        const response = await this._fetch(url);

        if (!response.ok) {
            throw new Error(`Patient search failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.results || [];
    }

    async createPatient(patientData) {
        const payload = {
            person: {
                names: [{
                    givenName: patientData.givenName,
                    familyName: patientData.familyName
                }],
                gender: patientData.gender,
                birthdate: patientData.birthdate
            },
            identifiers: [{
                identifier: patientData.identifier,
                identifierType: patientData.identifierType,
                location: this.locationUUID
            }]
        };

        const url = this._buildUrl('/ws/rest/v1/patient');
        const response = await this._fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Failed to create patient: ${response.statusText}`);
        }

        return await response.json();
    }

    async getOrCreateVisit(patientUuid) {
        // Check for active visits first
        const activeVisitsUrl = this._buildUrl(
            `/ws/rest/v1/visit?patient=${patientUuid}&includeInactive=false`
        );
        const activeVisitsResponse = await this._fetch(activeVisitsUrl);

        if (activeVisitsResponse.ok) {
            const activeVisitsData = await activeVisitsResponse.json();
            const activeVisits = activeVisitsData.results || [];

            if (activeVisits.length > 0) {
                console.log('Using existing active visit');
                return activeVisits[0];
            }
        }

        // Create new visit
        const visitPayload = {
            patient: patientUuid,
            visitType: this.visitTypeUUID,
            startDatetime: new Date().toISOString(),
            location: this.locationUUID
        };

        const url = this._buildUrl('/ws/rest/v1/visit');
        const response = await this._fetch(url, {
            method: 'POST',
            body: JSON.stringify(visitPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create visit: ${errorText}`);
        }

        return await response.json();
    }

    async createEncounter(encounterData) {
        const payload = {
            patient: encounterData.patientUuid,
            encounterType: this.encounterTypeUUID,
            encounterDatetime: new Date().toISOString(),
            location: this.locationUUID,
            visit: encounterData.visitUuid
        };

        const url = this._buildUrl('/ws/rest/v1/encounter');
        const response = await this._fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Failed to create encounter: ${response.statusText}`);
        }

        return await response.json();
    }

    async addClinicalNotes(encounterId, notes, patientUuid) {
        if (!this.clinicalNotesConceptUUID) {
            console.warn('Clinical notes concept not found, skipping...');
            return null;
        }

        // Get patient UUID from encounter if not provided
        if (!patientUuid) {
            const encounterUrl = this._buildUrl(`/ws/rest/v1/encounter/${encounterId}`);
            const encounterResponse = await this._fetch(encounterUrl);
            if (encounterResponse.ok) {
                const encounter = await encounterResponse.json();
                patientUuid = encounter.patient?.uuid;
            }
        }

        const payload = {
            person: patientUuid,
            encounter: encounterId,
            obsDatetime: new Date().toISOString(),
            concept: this.clinicalNotesConceptUUID,
            value: notes
        };

        const url = this._buildUrl('/ws/rest/v1/obs');
        const response = await this._fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.warn('Failed to add clinical notes');
            return null;
        }

        return await response.json();
    }

    async addDiagnosis(encounterId, diagnosis, patientUuid) {
        if (!this.diagnosisConceptUUID) {
            console.warn('Diagnosis concept not found, skipping...');
            return null;
        }

        // Get patient UUID from encounter if not provided
        if (!patientUuid) {
            const encounterUrl = this._buildUrl(`/ws/rest/v1/encounter/${encounterId}`);
            const encounterResponse = await this._fetch(encounterUrl);
            if (encounterResponse.ok) {
                const encounter = await encounterResponse.json();
                patientUuid = encounter.patient?.uuid;
            }
        }

        const payload = {
            person: patientUuid,
            encounter: encounterId,
            obsDatetime: new Date().toISOString(),
            concept: this.diagnosisConceptUUID,
            value: diagnosis
        };

        const url = this._buildUrl('/ws/rest/v1/obs');
        const response = await this._fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.warn('Failed to add diagnosis');
            return null;
        }

        return await response.json();
    }

    getMetadata() {
        return {
            name: this.name,
            encounterType: this.encounterTypeName || 'Unknown',
            visitType: this.visitTypeName || 'Unknown',
            location: this.locationName || 'Unknown',
            isDemo: false
        };
    }

    getInfo() {
        return {
            name: 'OpenMRS',
            description: 'Connect to an OpenMRS EHR instance',
            requiresAuth: true,
            isDemo: false,
            icon: '🏥'
        };
    }

    // Private helper methods

    _buildUrl(path) {
        if (this.useProxy) {
            return `${this.proxyPath}${path}`;
        }
        return `${this.baseUrl}${path}`;
    }

    async _fetch(url, options = {}) {
        const auth = btoa(`${this.username}:${this.password}`);

        const defaultOptions = {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        };

        return fetch(url, { ...defaultOptions, ...options });
    }

    async _loadEncounterTypes() {
        const url = this._buildUrl('/ws/rest/v1/encountertype');
        const response = await this._fetch(url);

        if (response.ok) {
            const data = await response.json();

            // Look for "Visit Note" specifically
            const visitNoteType = data.results.find(type =>
                type.display.toLowerCase().includes('visit note') ||
                type.display.toLowerCase().includes('visitnote')
            );

            if (visitNoteType) {
                this.encounterTypeUUID = visitNoteType.uuid;
                this.encounterTypeName = visitNoteType.display;
            } else if (data.results && data.results.length > 0) {
                this.encounterTypeUUID = data.results[0].uuid;
                this.encounterTypeName = data.results[0].display;
            }

            console.log('Encounter type:', this.encounterTypeName);
        }
    }

    async _loadLocations() {
        const url = this._buildUrl('/ws/rest/v1/location');
        const response = await this._fetch(url);

        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                this.locationUUID = data.results[0].uuid;
                this.locationName = data.results[0].display;
                console.log('Location:', this.locationName);
            }
        }
    }

    async _loadVisitTypes() {
        const url = this._buildUrl('/ws/rest/v1/visittype');
        const response = await this._fetch(url);

        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                this.visitTypeUUID = data.results[0].uuid;
                this.visitTypeName = data.results[0].display;
                console.log('Visit type:', this.visitTypeName);
            }
        }
    }

    async _loadConcepts() {
        // Load clinical notes concept - try multiple terms
        const notesTerms = ['clinical notes', 'notes', 'visit note', 'text', 'comment'];

        for (const term of notesTerms) {
            const notesUrl = this._buildUrl(`/ws/rest/v1/concept?q=${encodeURIComponent(term)}`);
            const notesResponse = await this._fetch(notesUrl);

            if (notesResponse.ok) {
                const notesData = await notesResponse.json();
                if (notesData.results && notesData.results.length > 0) {
                    this.clinicalNotesConceptUUID = notesData.results[0].uuid;
                    this.clinicalNotesConceptName = notesData.results[0].display;
                    console.log('Clinical notes concept found:', this.clinicalNotesConceptName);
                    break;
                }
            }
        }

        if (!this.clinicalNotesConceptUUID) {
            console.warn('⚠️ No clinical notes concept found in OpenMRS. Notes will not be saved.');
        }

        // Load diagnosis concept
        const diagUrl = this._buildUrl('/ws/rest/v1/concept?q=diagnosis');
        const diagResponse = await this._fetch(diagUrl);

        if (diagResponse.ok) {
            const diagData = await diagResponse.json();
            if (diagData.results && diagData.results.length > 0) {
                this.diagnosisConceptUUID = diagData.results[0].uuid;
                console.log('Diagnosis concept found:', diagData.results[0].display);
            }
        }
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenMRSConnector;
}
