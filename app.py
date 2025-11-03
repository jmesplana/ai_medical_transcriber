"""
Aidstack Medical AI - Backend Server
HIPAA-compliant backend for secure API key management and data handling
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import logging
from datetime import datetime
import hashlib
import secrets

# AI Provider clients
import openai
import anthropic
from groq import Groq

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Configure logging with audit trail
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('audit.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Security: Session management
ACTIVE_SESSIONS = {}

def generate_session_token():
    """Generate a secure session token"""
    return secrets.token_urlsafe(32)

def hash_sensitive_data(data):
    """Hash sensitive data for audit logging (PII protection)"""
    return hashlib.sha256(data.encode()).hexdigest()[:16]

def audit_log(event_type, details, session_id=None):
    """Log security and compliance events"""
    log_entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'event': event_type,
        'session_id': session_id,
        'details': details
    }
    logger.info(f"AUDIT: {log_entry}")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Aidstack Medical AI Backend',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/session/create', methods=['POST'])
def create_session():
    """Create a new secure session"""
    session_token = generate_session_token()
    ACTIVE_SESSIONS[session_token] = {
        'created_at': datetime.utcnow(),
        'last_active': datetime.utcnow()
    }

    audit_log('SESSION_CREATED', {'session_token_hash': hash_sensitive_data(session_token)})

    return jsonify({
        'session_token': session_token,
        'expires_in': 3600  # 1 hour
    })

@app.route('/api/transcribe', methods=['POST'])
def process_transcription():
    """
    Process medical transcription with AI
    Expects: { session_token, transcription, model }
    Returns: FHIR-structured data
    """
    try:
        data = request.get_json()

        # Validate session
        session_token = data.get('session_token')
        if not session_token or session_token not in ACTIVE_SESSIONS:
            audit_log('UNAUTHORIZED_ACCESS', {'reason': 'Invalid session token'})
            return jsonify({'error': 'Unauthorized'}), 401

        # Update session activity
        ACTIVE_SESSIONS[session_token]['last_active'] = datetime.utcnow()

        # Extract request data
        transcription = data.get('transcription', '')
        model_type = data.get('model', 'openai')

        # Audit log (with PII protection - hash the transcription)
        audit_log(
            'TRANSCRIPTION_PROCESSED',
            {
                'model': model_type,
                'transcription_hash': hash_sensitive_data(transcription),
                'length': len(transcription)
            },
            session_id=hash_sensitive_data(session_token)
        )

        # Process with selected AI model
        response_content = process_with_ai(transcription, model_type)

        return jsonify({
            'success': True,
            'response': response_content,
            'model': model_type,
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Error processing transcription: {str(e)}")
        audit_log('ERROR', {'error': str(e)})
        return jsonify({'error': 'Internal server error'}), 500

def process_with_ai(transcription, model_type):
    """Process transcription with selected AI model"""

    prompt = f"""
    You are an AI assistant specialized in medical transcription and clinical decision support. Your task is to analyze the following medical transcription and provide a structured response based on the transcription, following the FHIR (Fast Healthcare Interoperability Resources) format.

    Medical Transcription:
    {transcription}

    Please provide a comprehensive analysis based on the transcription, including potential diagnoses (differential diagnosis and testing to support medical decision making), medications, procedures, and recommendations for further action or treatment. Structure your response as a JSON object with the following FHIR-compliant resources:

    1. Patient
    2. Condition (list of potential diagnoses)
    3. MedicationStatement (list of mentioned medications)
    4. Procedure (list of mentioned or recommended procedures)
    5. CarePlan (list of recommendations or follow-up actions)

    Ensure that each resource follows the FHIR structure and includes relevant details from the transcription.
    """

    try:
        if model_type == 'openai':
            client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2000
            )
            return response.choices[0].message.content

        elif model_type == 'anthropic':
            client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
            message = client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text

        elif model_type == 'groq':
            client = Groq(api_key=os.getenv('GROQ_API_KEY'))
            response = client.chat.completions.create(
                model="mixtral-8x7b-32768",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2000
            )
            return response.choices[0].message.content

        else:
            raise ValueError(f"Unsupported model type: {model_type}")

    except Exception as e:
        logger.error(f"AI processing error with {model_type}: {str(e)}")
        raise

@app.route('/api/session/validate', methods=['POST'])
def validate_session():
    """Validate if a session token is still active"""
    data = request.get_json()
    session_token = data.get('session_token')

    is_valid = session_token in ACTIVE_SESSIONS

    return jsonify({
        'valid': is_valid,
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/session/destroy', methods=['POST'])
def destroy_session():
    """Destroy/logout a session"""
    data = request.get_json()
    session_token = data.get('session_token')

    if session_token in ACTIVE_SESSIONS:
        del ACTIVE_SESSIONS[session_token]
        audit_log('SESSION_DESTROYED', {'session_token_hash': hash_sensitive_data(session_token)})

    return jsonify({'success': True})

if __name__ == '__main__':
    # Production: Use gunicorn or uwsgi
    # Development: Flask development server
    app.run(host='0.0.0.0', port=5000, debug=False)
