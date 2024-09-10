"use client";

// import Image from "next/image";
import localFont from "next/font/local";
import React, { useRef, useState } from "react";

import GradualSpacing from "@/components/magicui/gradual-spacing";

import { TextGenerateEffect } from "../components/ui/text-generate-effect";
import ShimmerButton from "@/components/magicui/shimmer-button";
import PulsatingButton from "@/components/magicui/pulsating-button";
import Footer from "@/components/footer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function Home() {
  const [prompt, setPrompt] = useState(""); // State to manage the prompt input value.

  // Function to handle the reset button click
  const handleReset = () => {
    setPrompt(""); // Clear the textarea
    setResponseText(""); // Clear the generated response
    setLoading(false); // Clear the loading state
  };

  const [responseText, setResponseText] = useState(""); // State to hold the generated response.
  const [loading, setLoading] = useState(false); // State to manage loading state.
  const [error, setError] = useState(""); // State to manage error messages.
  // const [recording, setRecording] = useState(false);

  // const startRecording = () => {
  //   setRecording(true);
  //   navigator.mediaDevices
  //     .getUserMedia({ audio: true })
  //     .then((stream) => {
  //       const recorder = new MediaRecorder(stream);
  //       const audioChunks = [];
  //       recorder.addEventListener("dataavailable", (event) => {
  //         audioChunks.push(event.data);
  //       });
  //       recorder.addEventListener("stop", () => {
  //         const audioBlob = new Blob(audioChunks);
  //         const audioUrl = URL.createObjectURL(audioBlob);
  //         const audio = new Audio(audioUrl);
  //         audio.play();
  //       });
  //       recorder.start();
  //       setTimeout(() => {
  //         recorder.stop();
  //       }, 5000);
  //     })
  //     .catch((error) => {
  //       console.error("Error accessing microphone:", error);
  //     });
  // };

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioUrl(URL.createObjectURL(audioBlob));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResponseText("");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyAoMN85HNmohSDrBAS0YOIOXKE4khlSkxo",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to generate content. Please try again.");
    }

    const data = await response.json();

    // Extract just the text content
    const generatedText = data.candidates
      .map((candidate: { content: { parts: [] } }) =>
        candidate.content.parts
          .map((part: { text: string }) => part.text)
          .join("")
      )
      .join("\n\n"); // Combine all text parts with a newline in between

    setResponseText(generatedText);
    console.log("Generate successful", generatedText);
  };

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]`}
    >
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <GradualSpacing
          className="font-display text-center text-3xl font-bold tracking-[-0.1em]  text-black dark:text-white md:text-4xl md:leading-[3rem]"
          text="
      Chat with the smartest AI 
      "
        />

        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="mb-6">
            <textarea
              className="shadow appearance-none border rounded w-full py-20 px-10 mb-6  text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-start"
              id="prompt"
              placeholder="Enter your prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <div className="flex space-x-6">
              <ShimmerButton className="shadow-2xl">
                <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                  {loading ? "Generating..." : "Generate"}
                </span>
              </ShimmerButton>

              <button
                className="inline-flex items-center justify-center w-16 h-16 bg-gray-500 text-white rounded-full" // Changed width and height to match, and added rounded-full
                type="button"
                onClick={handleReset}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 10C2 10 4.00498 7.26822 5.63384 5.63824C7.26269 4.00827 9.5136 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.89691 21 4.43511 18.2543 3.35177 14.5M2 10V4M2 10H8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <PulsatingButton
                onClick={
                  isRecording ? handleStopRecording : handleStartRecording
                }
                className="inline-flex items-center justify-center w-16 h-16 bg-red-500 text-white rounded-full"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="feather feather-mic"
                >
                  <path d="M12 1C9.79 1 8 2.79 8 5v6c0 2.21 1.79 4 4 4s4-1.79 4-4V5c0-2.21-1.79-4-4-4z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </PulsatingButton>
              {audioUrl && (
                <div className="audio-preview mt-4">
                  <audio controls src={audioUrl}></audio>
                </div>
              )}
            </div>
          </div>
          {error && <p className="text-red-500">{error}</p>}
          {responseText && (
            <div className="mt-4 p-4 border rounded bg-gray-100">
              <p>Generated Content:</p>
              {/* <textarea
                readOnly
                className="w-full h-60 border p-2 bg-gray-50 text-gray-700"
                value={responseText}
              /> */}

              <TextGenerateEffect
                duration={2}
                filter={false}
                words={responseText}
              />
            </div>
          )}
        </form>
      </main>
      <Footer />
    </div>
  );
}
