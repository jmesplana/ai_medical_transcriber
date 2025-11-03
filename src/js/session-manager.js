/**
 * Session History Manager - localStorage persistence
 */

const SessionManager = {
    STORAGE_KEY: 'aidstack_sessions',
    MAX_SESSIONS: 50,

    saveSession(sessionData) {
        const sessions = this.getSessions();
        const session = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            patient: sessionData.patient,
            transcription: sessionData.transcription,
            fhirData: sessionData.fhirData,
            connector: sessionData.connector
        };

        sessions.unshift(session);

        // Keep only last MAX_SESSIONS
        if (sessions.length > this.MAX_SESSIONS) {
            sessions.length = this.MAX_SESSIONS;
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
        toast.success('Session saved successfully');
        return session.id;
    },

    getSessions() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading sessions:', e);
            return [];
        }
    },

    getSession(id) {
        const sessions = this.getSessions();
        return sessions.find(s => s.id === id);
    },

    deleteSession(id) {
        let sessions = this.getSessions();
        sessions = sessions.filter(s => s.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
        toast.success('Session deleted');
    },

    clearAll() {
        if (confirm('Are you sure you want to delete all saved sessions?')) {
            localStorage.removeItem(this.STORAGE_KEY);
            toast.success('All sessions cleared');
        }
    },

    exportSession(id, format = 'json') {
        const session = this.getSession(id);
        if (!session) {
            toast.error('Session not found');
            return;
        }

        if (format === 'json') {
            this.downloadJSON(session);
        } else if (format === 'pdf') {
            this.downloadPDF(session);
        }
    },

    downloadJSON(session) {
        const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aidstack-session-${session.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('JSON downloaded');
    },

    downloadPDF(session) {
        // Create simple PDF-like HTML
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Clinical Note - ${session.patient?.givenName} ${session.patient?.familyName}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { color: #1A365D; border-bottom: 3px solid #FF6B35; padding-bottom: 10px; }
        h2 { color: #1A365D; margin-top: 30px; }
        .header { background: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .transcription { background: #F8FAFC; padding: 15px; border-left: 4px solid #1A365D; }
        .fhir-item { background: white; border: 1px solid #E2E8F0; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .timestamp { color: #64748B; font-size: 12px; }
    </style>
</head>
<body>
    <h1>Clinical Documentation</h1>

    <div class="header">
        <h2>Patient Information</h2>
        <p><strong>Name:</strong> ${session.patient?.givenName} ${session.patient?.familyName}</p>
        <p><strong>Gender:</strong> ${session.patient?.gender}</p>
        <p><strong>Birth Date:</strong> ${session.patient?.birthdate}</p>
        <p><strong>ID:</strong> ${session.patient?.identifier}</p>
        <p class="timestamp">Session Date: ${new Date(session.timestamp).toLocaleString()}</p>
    </div>

    <div class="section">
        <h2>Transcription</h2>
        <div class="transcription">${session.transcription}</div>
    </div>

    <div class="section">
        <h2>Clinical Data (FHIR)</h2>
        ${this.formatFHIRForPDF(session.fhirData)}
    </div>
</body>
</html>
        `;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aidstack-note-${session.id}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Clinical note downloaded (open in browser and print to PDF)');
    },

    formatFHIRForPDF(fhirData) {
        if (!fhirData || !fhirData.entry) return '<p>No clinical data</p>';

        let html = '';
        const categories = {
            'Condition': 'Diagnoses',
            'Observation': 'Symptoms/Observations',
            'MedicationStatement': 'Medications',
            'Procedure': 'Procedures'
        };

        Object.keys(categories).forEach(resourceType => {
            const items = fhirData.entry.filter(e => e.resource?.resourceType === resourceType);
            if (items.length > 0) {
                html += `<h3>${categories[resourceType]}</h3>`;
                items.forEach(item => {
                    const text = item.resource.code?.text || item.resource.medicationCodeableConcept?.text || 'N/A';
                    html += `<div class="fhir-item">${text}</div>`;
                });
            }
        });

        return html;
    }
};

window.SessionManager = SessionManager;
