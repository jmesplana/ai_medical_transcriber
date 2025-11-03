# Aidstack Medical AI - Modular Architecture

## Overview

Version 2.0 introduces a modular, connector-based architecture that allows users to:
- **Try the app without an EHR** using Demo Mode
- **Connect to multiple EHR systems** via pluggable connectors
- **Easily add new EHR integrations** following a standard interface

## Directory Structure

```
ai_medical_transcriber/
├── src/                      # Frontend application
│   ├── index.html           # Main application UI
│   ├── js/                  # JavaScript modules (future)
│   └── css/                 # Stylesheets (future)
│
├── connectors/              # EHR connector plugins
│   ├── base-connector.js    # Base class/interface
│   ├── demo-connector.js    # Demo mode (no EHR)
│   ├── openmrs-connector.js # OpenMRS integration
│   └── README.md            # How to create connectors
│
├── config/                  # Configuration files
│   └── connectors.json      # Connector registry
│
├── server.js                # Node.js server
├── package.json             # Dependencies
└── .env                     # API keys (gitignored)
```

## Key Features

### 1. Connector Selection (Step 0)

Users start by selecting their EHR connection:

```
Step 0: Choose EHR Connection
├── Demo Mode (default)
│   └── No login required
│   └── In-browser storage only
│   └── Perfect for testing
│
└── OpenMRS
    └── Requires credentials
    └── Connects to real EHR
    └── Production-ready
```

###2. Demo Mode Benefits

**For Users Without EHR Access:**
- Try all features without credentials
- Pre-loaded demo patients
- Simulated network delays
- Data stored in browser memory
- No data leaves your computer

**Perfect for:**
- Product demonstrations
- Training sessions
- Development/testing
- Proof of concept presentations

### 3. Pluggable Connector System

All connectors implement the same interface:

```javascript
class YourConnector extends BaseConnector {
    async initialize()                          // Setup
    async searchPatients(query)                 // Search
    async createPatient(patientData)            // Create patient
    async getOrCreateVisit(patientUuid)         // Visit management
    async createEncounter(encounterData)        // Clinical note
    async addClinicalNotes(encounterId, notes)  // Add notes
    async addDiagnosis(encounterId, diagnosis)  // Add diagnosis
    getMetadata()                               // Display info
}
```

### 4. Connector Registry

Connectors are registered in `config/connectors.json`:

```json
{
  "connectors": [
    {
      "id": "demo",
      "name": "Demo Mode",
      "enabled": true,
      "requiresAuth": false
    },
    {
      "id": "openmrs",
      "name": "OpenMRS",
      "enabled": true,
      "requiresAuth": true,
      "config": {
        "baseUrl": "https://dev3.openmrs.org/openmrs"
      }
    }
  ],
  "default": "demo"
}
```

## User Workflow

### Option 1: Demo Mode (No EHR)

1. **Step 0**: Select "Demo Mode"
2. **Step 1**: Choose demo patient or create new
3. **Step 2**: Record clinical note
4. **Step 3**: Review AI-extracted FHIR data
5. **Step 4**: "Save" to browser memory (see summary)

### Option 2: OpenMRS

1. **Step 0**: Select "OpenMRS"
2. **Connecting**: App authenticates & loads metadata
3. **Step 1**: Search real patients or create new
4. **Step 2**: Record clinical note
5. **Step 3**: Review AI-extracted FHIR data
6. **Step 4**: Push to OpenMRS server (see summary)

## Adding New Connectors

See `connectors/README.md` for detailed instructions.

**Quick steps:**
1. Create `connectors/your-ehr-connector.js`
2. Extend `BaseConnector`
3. Implement required methods
4. Register in `config/connectors.json`
5. Test with demo data first

**Potential Connectors:**
- Epic FHIR
- Cerner/Oracle Health
- Athenahealth
- eClinicalWorks
- FHIR R4 Generic
- HL7 v2
- CSV Export
- Blockchain Storage

## Technical Details

### Server (server.js)

- Serves files from `src/`, `connectors/`, `config/`
- Proxies OpenMRS API requests (CORS bypass)
- Supports multiple MIME types
- Clean routing for static assets

### Connector Loading

1. Page loads → fetch `/config/connectors.json`
2. Display enabled connectors as cards
3. User selects → instantiate connector class
4. Call `initialize()` → load metadata
5. Proceed to patient selection

### Demo Connector Features

- In-memory storage (no persistence)
- 2 pre-loaded demo patients
- Simulated API delays (300-500ms)
- Realistic UUID generation
- Full FHIR workflow support
- Data export for debugging

### OpenMRS Connector Features

- Basic Auth with proxy
- Dynamic metadata loading
- Visit overlap detection
- "Visit Note" encounter type
- Clinical notes as observations
- Diagnoses as observations
- Full FHIR R4 compliance

## Configuration

### Environment Variables (.env)

```
OPENAI_API_KEY=sk-proj-...
```

### Connector Config (connectors.json)

```json
{
  "connectors": [...],
  "default": "demo"  // Auto-select on load
}
```

## Migration from v1

**Old Structure:**
```
index-v2.html (monolithic, 4600+ lines)
proxy-server.js (OpenMRS-specific)
```

**New Structure:**
```
src/index.html (with connector selection)
connectors/ (pluggable)
server.js (generic, multi-connector)
```

**Old files preserved:**
- `index.html` → Original backup
- `index-v2.html` → Working v1 version
- `proxy-server.js` → Old server (use `npm run old`)

## Future Enhancements

1. **Connector Marketplace**: Browse/install connectors
2. **Connector Authentication UI**: Configure credentials in-app
3. **Offline Mode**: PWA with local sync
4. **Multi-connector Sync**: Push to multiple EHRs
5. **Blockchain Integration**: Patient-owned data vault
6. **HL7 FHIR Bulk Export**: Export all data
7. **Speaker Diarization**: Distinguish voices
8. **Ambient Listening**: Continuous capture

## Getting Started

### Run the App

```bash
npm start
# or
node server.js
```

Visit: **http://localhost:3000**

### Test Demo Mode

1. Select "Demo Mode"
2. Try existing patient "John Demo"
3. Record a note: "Patient presents with headache and fever"
4. Review AI-generated FHIR data
5. See summary with encounter details

### Test OpenMRS

1. Select "OpenMRS"
2. Search for patient: "mark"
3. Record clinical note
4. Push to dev3.openmrs.org
5. Verify in OpenMRS web interface

## Troubleshooting

**Connectors not loading?**
- Check `/config/connectors.json` exists
- Verify server is serving `/config/` correctly
- Check browser console for errors

**Demo mode not working?**
- Ensure `DemoConnector` class is loaded
- Check browser console for errors
- Verify `base-connector.js` loaded first

**OpenMRS connection failing?**
- Verify proxy is working
- Check OpenMRS credentials
- Ensure dev3.openmrs.org is accessible

## Support

- **Connector Issues**: See `connectors/README.md`
- **Architecture Questions**: This file
- **Bug Reports**: GitHub Issues
- **Feature Requests**: GitHub Discussions

---

**Version**: 2.0.0
**Last Updated**: 2025-11-03
**License**: MIT
