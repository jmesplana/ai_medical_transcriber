# AI Medical Transcription App

## Overview

This Medical Transcription App is a web-based tool that uses speech recognition and AI to transcribe and process medical information. It's designed to assist medical professionals in quickly documenting patient information, including findings, symptoms, potential diagnoses, plans, and treatments.

![Medical Transcription App Screenshot](https://github.com/jmesplana/ai_medical_transcriber/blob/main/ai_medical_transcription_all.png)

## Features

- Real-time speech-to-text transcription
- AI-powered processing of medical information
- Categorization of medical data into structured formats
- Support for multiple AI providers (OpenAI, Anthropic, Groq)
- User-friendly interface with visual feedback

## Prerequisites

- A modern web browser (Chrome or Edge recommended for best speech recognition support)
- An API key from one of the supported AI providers (OpenAI, Anthropic, or Groq)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/jmesplana/ai_medical_transciber.git
   ```
2. Navigate to the project directory:
   ```
   cd ai_medical_transciber
   ```
3. Open `index.html` in your web browser.

## Usage

1. Open the app in your web browser.
2. Enter your API key in the provided field.
3. Click the microphone icon to start recording.
4. Speak clearly, providing medical information about a patient.
5. The app will transcribe your speech in real-time.
6. Once you stop speaking, the AI will process the transcription and categorize the information.
7. Review the processed information in the "Processed Data" section.

## Important Notes

- **Security**: This app processes the API key client-side. This is not secure for production use and is intended for testing and demonstration purposes only.
- **Privacy**: Be aware that transcriptions are sent to external AI services for processing. Ensure you have appropriate consent and follow relevant privacy regulations when using real patient data.
- **Costs**: Using the AI services may incur costs depending on your API plan. Monitor your usage to manage expenses.

## Customization

You can customize the AI provider by modifying the `apiUrl` in the `processTranscription` function. The default is set to OpenAI's API.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Web Speech API for speech recognition capabilities
- OpenAI, Anthropic, and Groq for AI processing capabilities

## Contact

If you have any questions or feedback, please open an issue in this repository.
