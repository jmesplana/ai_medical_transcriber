/**
 * Medical Term Correction Dictionary
 * Common medical terms and their corrections
 */

const MedicalDictionary = {
    terms: {
        // Common medications
        'amoxicillin': ['amoxicillin', 'amoxycillin'],
        'ibuprofen': ['ibuprofen', 'advil', 'motrin'],
        'acetaminophen': ['acetaminophen', 'tylenol', 'paracetamol'],
        'metformin': ['metformin', 'glucophage'],
        'lisinopril': ['lisinopril', 'prinivil', 'zestril'],
        'atorvastatin': ['atorvastatin', 'lipitor'],
        'omeprazole': ['omeprazole', 'prilosec'],
        'levothyroxine': ['levothyroxine', 'synthroid'],
        'metoprolol': ['metoprolol', 'lopressor', 'toprol'],
        'amlodipine': ['amlodipine', 'norvasc'],

        // Common conditions
        'hypertension': ['hypertension', 'high blood pressure', 'htn'],
        'diabetes': ['diabetes', 'diabetes mellitus', 'dm'],
        'pneumonia': ['pneumonia', 'lung infection'],
        'bronchitis': ['bronchitis'],
        'asthma': ['asthma'],
        'copd': ['copd', 'chronic obstructive pulmonary disease'],
        'migraine': ['migraine', 'migraine headache'],
        'arthritis': ['arthritis'],
        'depression': ['depression', 'major depressive disorder'],
        'anxiety': ['anxiety', 'anxiety disorder'],

        // Symptoms
        'dyspnea': ['dyspnea', 'shortness of breath', 'sob'],
        'nausea': ['nausea'],
        'vomiting': ['vomiting', 'emesis'],
        'diarrhea': ['diarrhea'],
        'constipation': ['constipation'],
        'fatigue': ['fatigue', 'tiredness'],
        'fever': ['fever', 'pyrexia'],
        'cough': ['cough'],
        'headache': ['headache'],
        'chest pain': ['chest pain'],

        // Procedures
        'echocardiogram': ['echocardiogram', 'echo', 'cardiac ultrasound'],
        'mri': ['mri', 'magnetic resonance imaging'],
        'ct scan': ['ct scan', 'cat scan', 'computed tomography'],
        'x-ray': ['x-ray', 'radiograph'],
        'blood test': ['blood test', 'lab work'],
        'ekg': ['ekg', 'ecg', 'electrocardiogram'],
        'colonoscopy': ['colonoscopy'],
        'endoscopy': ['endoscopy']
    },

    // Correct common speech recognition errors
    corrections: {
        'high per tension': 'hypertension',
        'die of bees': 'diabetes',
        'new monia': 'pneumonia',
        'a fib': 'atrial fibrillation',
        'i view': 'ibuprofen',
        'type a now': 'tylenol',
        'amox': 'amoxicillin',
        'metro': 'metoprolol',
        'lip a door': 'lipitor',
        'soon through': 'synthroid'
    },

    correctText(text) {
        let corrected = text;

        // Apply corrections
        Object.keys(this.corrections).forEach(wrong => {
            const regex = new RegExp(wrong, 'gi');
            corrected = corrected.replace(regex, this.corrections[wrong]);
        });

        return corrected;
    },

    findSimilarTerms(query) {
        query = query.toLowerCase();
        const matches = [];

        Object.keys(this.terms).forEach(canonical => {
            const variants = this.terms[canonical];
            if (variants.some(v => v.includes(query) || query.includes(v))) {
                matches.push({
                    canonical,
                    match: variants.find(v => v.includes(query) || query.includes(v))
                });
            }
        });

        return matches;
    },

    isValidMedicalTerm(term) {
        term = term.toLowerCase();
        return Object.values(this.terms).some(variants =>
            variants.some(v => v.toLowerCase() === term)
        );
    }
};

window.MedicalDictionary = MedicalDictionary;
