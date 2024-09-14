"use client";

import localFont from "next/font/local";
import React, { useRef, useState, useEffect } from "react";

import Image from "next/image";
import Footer from "@/components/footer";

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

export default function ChatPage() {
  const [messages, setMessages] = useState<
    { sender: "user" | "bot"; content: string; type: "text" | "audio" }[]
  >([]);
  const [message, setMessage] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const handleReset = () => {
    setMessage("");
    setMessages([]);

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

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
        const newAudioUrl = URL.createObjectURL(audioBlob);

        setMessages((prev) => [
          ...prev,
          { sender: "user", content: newAudioUrl, type: "audio" },
        ]);
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

  // const handleSendMessage = () => {
  //   if (message.trim()) {
  //     setMessages((prev) => [
  //       ...prev,
  //       { sender: "user", content: message.trim(), type: "text" },
  //     ]);
  //     setMessage("");
  //     // Simulate AI response (replace this with actual API call)
  //     setTimeout(() => {
  //       setMessages((prev) => [
  //         ...prev,
  //         { sender: "bot", content: "This is a simulated response.", type: "text" },
  //       ]);
  //     }, 1000);
  //   }
  // };

  const handleSendMessage = async () => {
    if (message.trim()) {
      // Add user's message to the conversation
      setMessages((prev) => [
        ...prev,
        { sender: "user", content: message.trim(), type: "text" },
      ]);

      setMessage(""); // Clear input field

      try {
        // Send the message to the API
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyAoMN85HNmohSDrBAS0YOIOXKE4khlSkxo`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: message.trim() }] }],
            }),
          }
        );

        if (!response.ok) {
          throw new Error("API request failed");
        }

        const data = await response.json();
        const generatedText = data.candidates
          .map((candidate: { content: { parts: [] } }) =>
            candidate.content.parts
              .map((part: { text: string }) => part.text)
              .join("")
          )
          .join("\n\n");

        // Add AI's response to the conversation
        setMessages((prev) => [
          ...prev,
          { sender: "bot", content: generatedText, type: "text" },
        ]);
      } catch (error) {
        console.error("Error generating content:", error);
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            content: "Failed to generate content.",
            type: "text",
          },
        ]);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} flex flex-col items-center justify-between h-screen`}
    >
      <header className="w-full flex items-center justify-between p-4 bg-gray-200">
        <Image
          src={"/logo.png"}
          alt="Logo"
          width={50}
          height={50}
          className="rounded-full"
        />
        <h1 className="font-bold text-lg">Chat with SAI</h1>
      </header>

      <div
        className="flex-1 w-full p-4 overflow-y-auto bg-gray-100"
        ref={chatBoxRef}
        style={{ height: "calc(100vh - 150px)" }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`w-full my-2 flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`${
                msg.sender === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 text-black"
              } p-2 rounded-lg max-w-xs`}
            >
              {msg.type === "text" ? (
                <p>{msg.content}</p>
              ) : (
                <audio controls src={msg.content}></audio>
              )}
            </div>
          </div>
        ))}
      </div>

      <footer className="w-full p-4 bg-gray-200">
  <div className="flex flex-col lg:flex-row items-start lg:items-center">
    <Textarea
      className="w-full lg:flex-1 border rounded p-2 mb-4 lg:mb-0 lg:mr-4"
      placeholder="Type your message"
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      onKeyDown={handleKeyDown}
      rows={1}
    />

    <div className="flex w-full lg:w-auto flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-2">
      <button
        className="w-full lg:w-auto bg-gray-500 text-white px-4 py-2 rounded-full"
        type="button"
        onClick={handleReset}
      >
        Reset
        {/* <svg
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
        </svg> */}
      </button>

      <button
        onClick={handleSendMessage}
        className="w-full lg:w-auto bg-blue-500 text-white px-4 py-2 rounded-full"
      >
        Send
      </button>

      <button
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        className={`w-full lg:w-auto px-4 py-2 rounded-full ${
          isRecording ? "bg-green-500" : "bg-red-500"
        } text-white`}
      >
        {isRecording ? "Stop" : "Record"}
      </button>
    </div>
  </div>
</footer>


      <Footer />
    </div>
  );
}
