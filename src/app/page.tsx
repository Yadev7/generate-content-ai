"use client";

import localFont from "next/font/local";
import React, { useRef, useState, useEffect } from "react";
import jsPDF from "jspdf";

import GradualSpacing from "@/components/magicui/gradual-spacing";
import ShimmerButton from "@/components/magicui/shimmer-button";
import PulsatingButton from "@/components/magicui/pulsating-button";
import Footer from "@/components/footer";

import Image from "next/image";

// import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea";

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
  useEffect(() => {
    if (typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      script.async = true;
      script.setAttribute("data-ad-client", "YOUR_ADSENSE_CLIENT_ID");
      document.head.appendChild(script);
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  }, []);

  const [prompt, setPrompt] = useState("");
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  

  const handleReset = () => {
    setPrompt("");
    setResponseText("");
    setLoading(false);
    setAudioUrl(null);
    setValidationMessage("");
  };

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
    if (!prompt.trim()) {
      setValidationMessage("Prompt cannot be empty.");
      return;
    }

    setLoading(true);
    setError("");
    setResponseText("");
    setValidationMessage("");

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
    const generatedText = data.candidates
      .map((candidate: { content: { parts: [] } }) =>
        candidate.content.parts
          .map((part: { text: string }) => part.text)
          .join("")
      )
      .join("\n\n");

    setResponseText(generatedText);
    setLoading(false);
    setPrompt("");
  };



  const handleDownloadPDF = () => {
    if (responseText) {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10; // You can adjust this value to change the margins
      const maxLineWidth = pageWidth - 2 * margin; // Calculate max line width by subtracting margins
      const lineHeight = 10; // Line height for the text

      // Split the response text into lines that fit within the max line width
      const textLines = doc.splitTextToSize(responseText, maxLineWidth);

      // Position the text at (margin, margin) and add new lines until the end of the text
      let yPosition = margin;

      textLines.forEach((line: string | string[]) => {
        if (yPosition + lineHeight > pageHeight - margin) {
          doc.addPage(); // Add a new page if the current page is full
          yPosition = margin; // Reset the y-position for the new page
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight; // Move down for the next line
      });

      doc.save("generated-content.pdf");
    }
  };

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]`}
    >
      <Image
        src={"/logo.png"}
        alt="Logo"
        width={100}
        height={100}
        className="rounded-full mt-10"
      />

      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-center">
        <GradualSpacing
          className="font-display text-center text-3xl font-bold tracking-[-0.1em] text-black dark:text-white md:text-4xl md:leading-[3rem]"
          text="Chat with SAI"
        />

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md mx-auto px-4 py-6 flex flex-col items-center"
        >
          <div className="mb-6 w-full">
            <Textarea
              className="shadow appearance-none border rounded w-full py-2 px-4 mb-6 text-gray-700 leading-tight focus:outline-none focus:shadow-outline resize-none text-sm md:text-base"
              id="prompt"
              placeholder="Enter your prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={10}
              cols={50}
            />

            {validationMessage && (
              <p className="text-red-500 text-sm md:text-base">
                {validationMessage}
              </p>
            )}

            <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between  md:space-x-2 md:items-center ">
              <button
                className="inline-flex items-center justify-center w-full h-10 md:w-16 md:h-16 bg-gray-500 text-white rounded-full"
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

              <ShimmerButton className="shadow-2xl w-full md:w-auto">
                <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                  {loading ? "Generating..." : "Generate"}
                </span>
              </ShimmerButton>

              <PulsatingButton
                type="button"
                onClick={
                  isRecording ? handleStopRecording : handleStartRecording
                }
                className={`btn w-full h-10 md:w-16 md:h-16 ${
                  isRecording
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                } rounded-full`}
              >
                {isRecording ? (
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
                    className="feather feather-square"
                  >
                    <rect x="6" y="6" width="12" height="12"></rect>
                  </svg>
                ) : (
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
                )}
              </PulsatingButton>
            </div>

            {audioUrl && (
              <div className="audio-preview mt-4">
                <audio controls src={audioUrl}></audio>
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm md:text-base">{error}</p>
          )}
          {responseText && (
            <div className="mt-4 p-4  rounded bg-gray-100">
              <p className="font-bold mb-4">Generated Content:</p>
              <Textarea
                className="w-full h-40 md:h-60 border rounded p-2 text-gray-700 resize-none"
                value={responseText}
                cols={50}
                rows={10}
                onChange={(e) => setResponseText(e.target.value)}
              />
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              >
                Download PDF
              </button>
            </div>
          )}
        </form>
      </main>

      <Footer />
    </div>
  );
}
