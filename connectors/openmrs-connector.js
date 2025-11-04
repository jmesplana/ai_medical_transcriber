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

        // Metadata storage - can be configured or auto-loaded
        this.encounterTypeUUID = config.encounterTypeUUID || null;
        this.encounterTypeName = null;
        this.locationUUID = config.locationUUID || null;
        this.locationName = null;
        this.visitTypeUUID = config.visitTypeUUID || null;
        this.visitTypeName = null;
        this.clinicalNotesConceptUUID = config.clinicalNotesConceptUUID || null;
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
        // Get or use default identifier type UUID
        let identifierTypeUuid = patientData.identifierType;

        // If no identifier type provided, get the default one from OpenMRS
        if (!identifierTypeUuid) {
            try {
                const idTypesUrl = this._buildUrl('/ws/rest/v1/patientidentifiertype');
                const idTypesResponse = await this._fetch(idTypesUrl);
                if (idTypesResponse.ok) {
                    const idTypesData = await idTypesResponse.json();
                    // Use first available identifier type
                    if (idTypesData.results && idTypesData.results.length > 0) {
                        identifierTypeUuid = idTypesData.results[0].uuid;
                    }
                }
            } catch (e) {
                console.warn('Could not fetch identifier types, using fallback');
            }
        }

        // Get identifier - either from user or generate via IDGen
        let identifier = patientData.identifier;

        if (!identifier) {
            // Try to auto-generate using IDGen module
            try {
                console.log('🔄 Attempting to auto-generate identifier via IDGen...');
                const autoGenUrl = this._buildUrl(`/ws/rest/v1/idgen/autogenerationoption?identifierType=${identifierTypeUuid}`);
                const autoGenResponse = await this._fetch(autoGenUrl);

                if (autoGenResponse.ok) {
                    const autoGenData = await autoGenResponse.json();
                    if (autoGenData.results && autoGenData.results.length > 0) {
                        const sourceUuid = autoGenData.results[0].source?.uuid;
                        if (sourceUuid) {
                            console.log('📋 Found identifier source:', sourceUuid);
                            // Generate identifier from the source
                            const genUrl = this._buildUrl(`/ws/rest/v1/idgen/identifiersource/${sourceUuid}/identifier`);
                            const genResponse = await this._fetch(genUrl, { method: 'POST', body: '{}' });
                            if (genResponse.ok) {
                                const genData = await genResponse.json();
                                identifier = genData.identifier;
                                console.log('✅ Auto-generated identifier from IDGen:', identifier);
                            } else {
                                console.warn('⚠️ Failed to generate identifier:', await genResponse.text());
                            }
                        } else {
                            console.warn('⚠️ No identifier source found in auto-generation options');
                        }
                    } else {
                        console.warn('⚠️ No auto-generation options configured for this identifier type');
                    }
                } else {
                    console.warn('⚠️ Could not fetch auto-generation options:', await autoGenResponse.text());
                }
            } catch (e) {
                console.warn('⚠️ Error during identifier auto-generation:', e.message);
            }
        }

        // If still no identifier, throw error
        if (!identifier) {
            throw new Error('Patient identifier is required. Please either:\n1. Enter a patient identifier manually, or\n2. Configure IDGen auto-generation in OpenMRS (Admin > Manage Patient Identifier Sources)');
        }

        const payload = {
            person: {
                names: [{
                    givenName: patientData.givenName,
                    familyName: patientData.familyName
                }],
                gender: patientData.gender === 'male' ? 'M' : patientData.gender === 'female' ? 'F' : patientData.gender.toUpperCase(),
                birthdate: patientData.birthdate
            },
            identifiers: [{
                identifier: identifier,
                identifierType: identifierTypeUuid,
                location: this.locationUUID
            }]
        };

        const url = this._buildUrl('/ws/rest/v1/patient');
        const response = await this._fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Patient creation error:', errorText);
            throw new Error(`Failed to create patient: ${response.statusText}. ${errorText}`);
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

    async addDiagnosis(encounterId, diagnosis, patientUuid, icd10Code = null, confidence = 0.8, rank = 1) {
        console.log('🔍 Adding diagnosis:', diagnosis, 'ICD-10:', icd10Code, 'Confidence:', confidence, 'Rank:', rank);

        // Get patient UUID from encounter if not provided
        if (!patientUuid) {
            const encounterUrl = this._buildUrl(`/ws/rest/v1/encounter/${encounterId}`);
            const encounterResponse = await this._fetch(encounterUrl);
            if (encounterResponse.ok) {
                const encounter = await encounterResponse.json();
                patientUuid = encounter.patient?.uuid;
            }
        }

        // Search for the diagnosis concept
        let diagnosisConceptUuid = null;

        // Try ICD-10 code search first if available (more accurate)
        if (icd10Code) {
            try {
                // Search concepts by source and code mapping
                // This searches for concepts that have mappings to ICD-10-WHO with the specific code
                const conceptSearchUrl = this._buildUrl(`/ws/rest/v1/concept?source=ICD-10-WHO&code=${encodeURIComponent(icd10Code)}`);
                console.log('🔍 Searching for concepts with ICD-10 code:', icd10Code, 'in ICD-10-WHO source');
                const conceptResponse = await this._fetch(conceptSearchUrl);

                if (conceptResponse.ok) {
                    const conceptData = await conceptResponse.json();
                    console.log('📊 Found', conceptData.results?.length || 0, 'concepts with this ICD-10 mapping');

                    if (conceptData.results && conceptData.results.length > 0) {
                        // Prefer diagnosis concepts over other types
                        let bestMatch = conceptData.results[0];

                        for (const concept of conceptData.results) {
                            console.log('  - Concept:', concept.display);

                            // Prefer concepts that don't have "associated with" or "due to"
                            const display = concept.display.toLowerCase();
                            if (!display.includes('associated with') &&
                                !display.includes('due to') &&
                                !display.includes('secondary to')) {
                                bestMatch = concept;
                                break;
                            }
                        }

                        diagnosisConceptUuid = bestMatch.uuid;
                        console.log('✅ Found concept via ICD-10 code:', bestMatch.display, 'UUID:', diagnosisConceptUuid);
                    } else {
                        console.log('⚠️ No concepts found with ICD-10 code:', icd10Code);
                    }
                }
            } catch (e) {
                console.warn('❌ ICD-10 code search failed:', e);
            }
        }

        // Fallback to name search if ICD-10 search didn't find anything
        if (!diagnosisConceptUuid) {
            try {
                const searchUrl = this._buildUrl(`/ws/rest/v1/concept?q=${encodeURIComponent(diagnosis)}`);
                console.log('🔍 Searching by diagnosis name:', diagnosis);
                const searchResponse = await this._fetch(searchUrl);
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    console.log('Concept search results:', searchData.results?.length || 0);

                    if (searchData.results && searchData.results.length > 0) {
                        // Log all results for debugging
                        console.log('All concept matches:', searchData.results.map(r => r.display).join(', '));

                        // Try to find the best match - prefer exact matches or shorter names
                        // Avoid concepts that are too specific (e.g., "Erectile dysfunction associated with...")
                        let bestMatch = searchData.results[0]; // Default to first result

                        for (const result of searchData.results) {
                            const resultName = result.display.toLowerCase();
                            const searchTerm = diagnosis.toLowerCase();

                            // Prefer exact match
                            if (resultName === searchTerm) {
                                bestMatch = result;
                                console.log('✅ Found exact match:', result.display);
                                break;
                            }

                            // Prefer shorter, simpler names that don't have "associated with" or "due to"
                            if (!resultName.includes('associated with') &&
                                !resultName.includes('due to') &&
                                resultName.includes(searchTerm)) {
                                if (result.display.length < bestMatch.display.length) {
                                    bestMatch = result;
                                }
                            }
                        }

                        diagnosisConceptUuid = bestMatch.uuid;
                        console.log('✅ Selected concept:', bestMatch.display, 'UUID:', diagnosisConceptUuid);
                    }
                }
            } catch (e) {
                console.warn('❌ Could not search for diagnosis concept:', e);
            }
        }

        // Map confidence to certainty (0-1 scale to OpenMRS certainty values)
        let certainty = "CONFIRMED";
        if (confidence < 0.6) {
            certainty = "PROVISIONAL";
        } else if (confidence < 0.8) {
            certainty = "PRESUMED";
        }

        // Use the correct patientdiagnoses endpoint
        const diagnosisPayload = {
            patient: patientUuid,
            encounter: encounterId,
            certainty: certainty,
            rank: rank
        };

        // Add diagnosis - must be an object with 'coded' property for concept-based diagnoses
        if (diagnosisConceptUuid) {
            diagnosisPayload.diagnosis = {
                coded: diagnosisConceptUuid
            };
            diagnosisPayload.condition = diagnosisConceptUuid;
        } else {
            // If we couldn't find a concept, we need to create it as a non-coded diagnosis
            // OpenMRS requires the 'condition' field, so we'll use a placeholder concept for "Other diagnosis"
            console.warn('⚠️ No concept found for:', diagnosis, '- will use non-coded diagnosis');

            // Try to find a generic "Other" or "Other diagnosis" concept
            try {
                const otherUrl = this._buildUrl('/ws/rest/v1/concept?q=other');
                const otherResponse = await this._fetch(otherUrl);
                if (otherResponse.ok) {
                    const otherData = await otherResponse.json();
                    if (otherData.results && otherData.results.length > 0) {
                        const otherConceptUuid = otherData.results[0].uuid;
                        diagnosisPayload.diagnosis = {
                            coded: otherConceptUuid,
                            nonCoded: diagnosis
                        };
                        diagnosisPayload.condition = otherConceptUuid;
                        console.log('Using "Other" concept as placeholder with non-coded text:', diagnosis);
                    }
                }
            } catch (e) {
                console.error('❌ Could not find placeholder concept:', e);
            }

            // If we still don't have a condition, skip this diagnosis
            if (!diagnosisPayload.condition) {
                console.warn('⚠️ Skipping diagnosis (no concept found):', diagnosis);
                return null;
            }
        }

        console.log('📝 Adding diagnosis via patientdiagnoses endpoint:', diagnosisPayload);
        const url = this._buildUrl('/ws/rest/v1/patientdiagnoses');
        const response = await this._fetch(url, {
            method: 'POST',
            body: JSON.stringify(diagnosisPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to add diagnosis:', response.status, errorText);

            // Log the full error for debugging
            console.error('Full diagnosis payload:', JSON.stringify(diagnosisPayload, null, 2));

            throw new Error(`Failed to add diagnosis: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Diagnosis added successfully:', result.uuid);
        return result;
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

    _addLuhnCheckDigit(identifier) {
        // Luhn algorithm implementation
        // Convert identifier to array of digits
        const digits = identifier.toString().split('').map(Number);

        // Double every second digit from right to left
        let sum = 0;
        let isSecond = false;

        for (let i = digits.length - 1; i >= 0; i--) {
            let digit = digits[i];

            if (isSecond) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isSecond = !isSecond;
        }

        // Calculate check digit
        const checkDigit = (10 - (sum % 10)) % 10;

        return identifier + checkDigit.toString();
    }

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
        // If already configured, skip loading
        if (this.encounterTypeUUID) {
            console.log('✅ Using configured encounter type UUID:', this.encounterTypeUUID);
            return;
        }

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
        // If already configured, skip loading
        if (this.locationUUID) {
            console.log('✅ Using configured location UUID:', this.locationUUID);
            return;
        }

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
        // If already configured, skip loading
        if (this.visitTypeUUID) {
            console.log('✅ Using configured visit type UUID:', this.visitTypeUUID);
            return;
        }

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
        // Check if clinical notes concept UUID is provided in config
        if (this.clinicalNotesConceptUUID) {
            console.log('✅ Using configured clinical notes concept UUID:', this.clinicalNotesConceptUUID);
            return;
        }

        // Otherwise, search for "Text of encounter note" concept
        const notesTerms = ['Text of encounter note', 'clinical notes', 'notes', 'visit note', 'text', 'comment'];

        for (const term of notesTerms) {
            const notesUrl = this._buildUrl(`/ws/rest/v1/concept?q=${encodeURIComponent(term)}`);
            const notesResponse = await this._fetch(notesUrl);

            if (notesResponse.ok) {
                const notesData = await notesResponse.json();
                if (notesData.results && notesData.results.length > 0) {
                    // For "Text of encounter note", look for exact match
                    if (term === 'Text of encounter note') {
                        const exactMatch = notesData.results.find(r =>
                            r.display.toLowerCase() === term.toLowerCase()
                        );
                        if (exactMatch) {
                            this.clinicalNotesConceptUUID = exactMatch.uuid;
                            this.clinicalNotesConceptName = exactMatch.display;
                            console.log('✅ Clinical notes concept found:', this.clinicalNotesConceptName, this.clinicalNotesConceptUUID);
                            break;
                        }
                    } else {
                        // For other terms, use first result
                        this.clinicalNotesConceptUUID = notesData.results[0].uuid;
                        this.clinicalNotesConceptName = notesData.results[0].display;
                        console.log('✅ Clinical notes concept found:', this.clinicalNotesConceptName, this.clinicalNotesConceptUUID);
                        break;
                    }
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
