// src/types/speech-recognition.d.ts

// Declare the global types for the SpeechRecognition API
declare global {
    interface Window {
      SpeechRecognition: string;
      webkitSpeechRecognition: string;
    }
  }
  
  export {};
  