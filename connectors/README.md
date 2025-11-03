# EHR Connectors

This directory contains pluggable EHR connectors for Aidstack Medical AI.

## Available Connectors

### 1. Demo Connector (`demo-connector.js`)
- **Purpose**: Test the app without a real EHR connection
- **Storage**: In-browser memory only
- **Auth**: None required
- **Perfect for**: Demos, testing, development

### 2. OpenMRS Connector (`openmrs-connector.js`)
- **Purpose**: Connect to OpenMRS EHR instances
- **Storage**: OpenMRS server
- **Auth**: Basic Auth (username/password)
- **Perfect for**: Production use with OpenMRS

## Creating a New Connector

### Step 1: Create the Connector Class

Create a new file `connectors/your-ehr-connector.js`:

```javascript
class YourEHRConnector extends BaseConnector {
    constructor(config) {
        super(config);
        this.name = 'Your EHR Name';
        this.isDemo = false;
        // Add your configuration
    }

    async initialize() {
        // Load metadata, authenticate, etc.
    }

    async searchPatients(query) {
        // Return array of patients matching query
    }

    async createPatient(patientData) {
        // Create new patient, return patient object with UUID
    }

    async getOrCreateVisit(patientUuid) {
        // Get or create visit for patient
    }

    async createEncounter(encounterData) {
        // Create encounter/visit note
    }

    async addClinicalNotes(encounterId, notes) {
        // Add clinical notes to encounter
    }

    async addDiagnosis(encounterId, diagnosis) {
        // Add diagnosis to encounter
    }

    getMetadata() {
        return {
            name: this.name,
            encounterType: 'Your encounter type',
            visitType: 'Your visit type',
            location: 'Your location',
            isDemo: false
        };
    }

    getInfo() {
        return {
            name: 'Your EHR',
            description: 'Connect to Your EHR system',
            requiresAuth: true,
            isDemo: false,
            icon: '🏥'
        };
    }
}
```

### Step 2: Register the Connector

Add your connector to `config/connectors.json`:

```json
{
  "connectors": [
    {
      "id": "your-ehr",
      "name": "Your EHR Name",
      "description": "Connect to Your EHR system",
      "icon": "🏥",
      "enabled": true,
      "requiresAuth": true,
      "class": "YourEHRConnector",
      "file": "your-ehr-connector.js",
      "config": {
        "apiUrl": "https://your-ehr.example.com/api",
        "apiKey": "your-api-key"
      }
    }
  ]
}
```

### Step 3: Test Your Connector

The connector will automatically appear in the EHR selection dropdown. Select it and test all operations:

1. Search for patients
2. Create new patient
3. Create visit
4. Create encounter
5. Add clinical notes
6. Add diagnoses

## Connector Interface Reference

### Required Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `initialize()` | None | `Promise<void>` | Initialize connector, load metadata |
| `searchPatients(query)` | `query: string` | `Promise<Array>` | Search for patients |
| `createPatient(data)` | `data: Object` | `Promise<Object>` | Create new patient |
| `getOrCreateVisit(patientUuid)` | `patientUuid: string` | `Promise<Object>` | Get or create visit |
| `createEncounter(data)` | `data: Object` | `Promise<Object>` | Create encounter |
| `addClinicalNotes(encounterId, notes)` | `encounterId: string, notes: string` | `Promise<Object>` | Add notes |
| `addDiagnosis(encounterId, diagnosis)` | `encounterId: string, diagnosis: string` | `Promise<Object>` | Add diagnosis |
| `getMetadata()` | None | `Object` | Return connector metadata |
| `getInfo()` | None | `Object` | Return display info |

### Patient Data Structure

```javascript
{
    givenName: string,
    familyName: string,
    gender: string,
    birthdate: string (YYYY-MM-DD),
    identifier: string,
    identifierType: string
}
```

### Encounter Data Structure

```javascript
{
    patientUuid: string,
    visitUuid: string
}
```

## Examples of Potential Connectors

- **Epic FHIR Connector**: Connect to Epic EHR via FHIR API
- **Cerner Connector**: Connect to Cerner/Oracle Health
- **Athenahealth Connector**: Connect to Athenahealth
- **eClinicalWorks Connector**: Connect to eCW
- **FHIR Generic Connector**: Generic FHIR R4 connector
- **HL7 Connector**: HL7 v2 message integration
- **CSV Export Connector**: Export data to CSV files
- **Blockchain Connector**: Store on blockchain (future)

## Best Practices

1. **Error Handling**: Always wrap API calls in try-catch
2. **Logging**: Use console.log/warn/error for debugging
3. **Network Delays**: Consider adding retry logic
4. **Authentication**: Store credentials securely
5. **CORS**: Use proxy server for browser-based connectors
6. **Testing**: Test with demo connector first

## Need Help?

Check the existing connectors (`demo-connector.js` and `openmrs-connector.js`) for working examples.
