/**
 * Demo/Mock EHR Connector
 * Simulates an EHR system without requiring actual credentials
 * Perfect for testing and demonstrations
 */

class DemoConnector extends BaseConnector {
    constructor(config) {
        super(config);
        this.name = 'Demo Mode';
        this.isDemo = true;

        // In-memory storage for demo
        this.patients = [
            {
                uuid: 'demo-patient-001',
                display: 'John Demo (Demo ID: DEMO001)',
                givenName: 'John',
                familyName: 'Demo',
                gender: 'M',
                birthdate: '1980-01-15',
                identifier: 'DEMO001'
            },
            {
                uuid: 'demo-patient-002',
                display: 'Jane Test (Demo ID: DEMO002)',
                givenName: 'Jane',
                familyName: 'Test',
                gender: 'F',
                birthdate: '1992-06-22',
                identifier: 'DEMO002'
            }
        ];

        this.visits = [];
        this.encounters = [];
        this.observations = [];
    }

    async initialize() {
        console.log('📋 Demo Connector initialized - No authentication required');
        return Promise.resolve();
    }

    async searchPatients(query) {
        // Simulate network delay
        await this._simulateDelay(300);

        const lowerQuery = query.toLowerCase();
        const results = this.patients.filter(p =>
            p.display.toLowerCase().includes(lowerQuery) ||
            p.givenName.toLowerCase().includes(lowerQuery) ||
            p.familyName.toLowerCase().includes(lowerQuery) ||
            p.identifier.toLowerCase().includes(lowerQuery)
        );

        console.log(`🔍 Demo: Found ${results.length} patients for query "${query}"`);
        return results;
    }

    async createPatient(patientData) {
        await this._simulateDelay(500);

        const newPatient = {
            uuid: `demo-patient-${Date.now()}`,
            display: `${patientData.givenName} ${patientData.familyName} (Demo ID: ${patientData.identifier})`,
            givenName: patientData.givenName,
            familyName: patientData.familyName,
            gender: patientData.gender,
            birthdate: patientData.birthdate,
            identifier: patientData.identifier
        };

        this.patients.push(newPatient);
        console.log('✅ Demo: Created patient', newPatient);
        return newPatient;
    }

    async getOrCreateVisit(patientUuid) {
        await this._simulateDelay(200);

        // Check for existing active visit
        const activeVisit = this.visits.find(v =>
            v.patient === patientUuid && v.stopDatetime === null
        );

        if (activeVisit) {
            console.log('📋 Demo: Using existing visit', activeVisit.uuid);
            return activeVisit;
        }

        // Create new visit
        const newVisit = {
            uuid: `demo-visit-${Date.now()}`,
            patient: patientUuid,
            visitType: 'demo-facility-visit',
            startDatetime: new Date().toISOString(),
            stopDatetime: null,
            location: 'demo-location'
        };

        this.visits.push(newVisit);
        console.log('✅ Demo: Created visit', newVisit.uuid);
        return newVisit;
    }

    async createEncounter(encounterData) {
        await this._simulateDelay(300);

        const newEncounter = {
            uuid: `demo-encounter-${Date.now()}`,
            patient: encounterData.patientUuid,
            visit: encounterData.visitUuid,
            encounterType: 'Visit Note',
            encounterDatetime: new Date().toISOString(),
            location: 'Demo Clinic'
        };

        this.encounters.push(newEncounter);
        console.log('✅ Demo: Created encounter', newEncounter.uuid);
        return newEncounter;
    }

    async addClinicalNotes(encounterId, notes) {
        await this._simulateDelay(200);

        const observation = {
            uuid: `demo-obs-${Date.now()}`,
            encounter: encounterId,
            concept: 'Clinical Notes',
            value: notes,
            obsDatetime: new Date().toISOString()
        };

        this.observations.push(observation);
        console.log('✅ Demo: Added clinical notes');
        return observation;
    }

    async addDiagnosis(encounterId, diagnosis) {
        await this._simulateDelay(200);

        const observation = {
            uuid: `demo-obs-${Date.now()}`,
            encounter: encounterId,
            concept: 'Diagnosis',
            value: diagnosis,
            obsDatetime: new Date().toISOString()
        };

        this.observations.push(observation);
        console.log('✅ Demo: Added diagnosis:', diagnosis);
        return observation;
    }

    getMetadata() {
        return {
            name: this.name,
            encounterType: 'Visit Note (Demo)',
            visitType: 'Facility Visit (Demo)',
            location: 'Demo Clinic',
            isDemo: true
        };
    }

    getInfo() {
        return {
            name: 'Demo Mode',
            description: 'Try the app without connecting to a real EHR. All data is stored in browser memory only.',
            requiresAuth: false,
            isDemo: true,
            icon: '🎭'
        };
    }

    // Helper method to simulate network delay
    _simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get all demo data (for debugging/export)
    getDemoData() {
        return {
            patients: this.patients,
            visits: this.visits,
            encounters: this.encounters,
            observations: this.observations
        };
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DemoConnector;
}
