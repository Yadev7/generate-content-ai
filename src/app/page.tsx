"use client";

import React, { useRef, useState, useEffect } from "react";
import localFont from "next/font/local";
import Image from "next/image";
import Footer from "@/components/footer";
import { Textarea } from "@/components/ui/textarea";
import { jsPDF } from "jspdf";


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
  const [topicContext, setTopicContext] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const handleReset = () => {
    setMessage("");
    setMessages([]);
    setTopicContext("");
    chatBoxRef.current?.scrollTo(0, 0);
    chatBoxRef.current?.focus();

    audioChunksRef.current = [];

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

  const handleSendMessage = async () => {
    if (message.trim()) {
      setMessages((prev) => [
        ...prev,
        { sender: "user", content: message.trim(), type: "text" },
      ]);

      setMessage("");

      try {
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyAoMN85HNmohSDrBAS0YOIOXKE4khlSkxo",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: topicContext + message.trim() }] }],
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

        setMessages((prev) => [
          ...prev,
          { sender: "bot", content: "Typing...", type: "text" },
        ]);

        let typingIndex = 0;
        const typingSpeed = 50;

        const typeText = () => {
          if (typingIndex < generatedText.length) {
            setMessages((prev) => {
              const updatedMessages = [...prev];
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                content: generatedText.slice(0, typingIndex + 1),
              };

              return updatedMessages;
            });

            typingIndex++;
            setTimeout(typeText, typingSpeed);
          }
        };

        setTimeout(typeText, typingSpeed);
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

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    let yOffset = 10; // Starting y position
    const lineHeight = 10; // Height for each line of text
    const maxLineWidth = 180; // Maximum line width for wrapping text
    const pageHeight = doc.internal.pageSize.height; // Page height

    messages.forEach((msg) => {
      if (msg.type === "text") {
        const text = `${msg.sender === "user" ? "User" : "Bot"}: ${
          msg.content
        }`;

        // Split text into lines that fit within maxLineWidth
        const lines = doc.splitTextToSize(text, maxLineWidth);

        lines.forEach((line: string | string[]) => {
          if (yOffset + lineHeight > pageHeight) {
            // If the current position exceeds the page height, add a new page
            doc.addPage();
            yOffset = 10; // Reset yOffset for new page
          }
          doc.text(line, 10, yOffset);
          yOffset += lineHeight;
        });

        // Add a blank space between different messages
        yOffset += lineHeight;
      }
    });

    // Save the generated PDF file
    doc.save("chat.pdf");
  };

  // const handleDownloadPDF = () => {
  //   const doc = new jsPDF();
  //   let yOffset = 10;
  //   const lineHeight = 10;
  //   const maxLineWidth = 180;

  //   messages.forEach((msg) => {
  //     if (msg.type === "text") {
  //       const text = `${msg.sender === "user" ? "User" : "Bot"}: ${msg.content}`;

  //       const lines = doc.splitTextToSize(text, maxLineWidth);
  //       lines.forEach((line: string | string[]) => {
  //         doc.text(line, 10, yOffset);
  //         yOffset += lineHeight;
  //       });

  //       yOffset += lineHeight; // Add extra space between messages
  //     }
  //   });

  //   doc.save("chat.pdf");
  // };

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

        <select
          name="topicContext"
          id="topicContext"
          value={topicContext}
          onChange={(e) => setTopicContext(e.target.value)}
        >
          <option value="You are a fitness expert">Fitness expert </option>
          <option value="You are a mathematics expert"> Math Expert </option>
          <option value="You are a cook expert"> Cook Expert</option>
          <option value="You are a fullstack developer expert">
            Fullstack Expert
          </option>
        </select>
      </header>

      <div
        className="flex-1 w-full p-4 overflow-y-auto bg-gray-100"
        ref={chatBoxRef}
        style={{ height: "calc(100vh - 150px)" }}
      >
        {messages.map((msg, index) => {
          const isFirstBotMessage =
            msg.sender === "bot" &&
            (index === 0 || messages[index - 1].sender !== "bot");

          return (
            <div
              key={index}
              className={`w-full my-3 flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              } items-center`}
            >
              {isFirstBotMessage && (
                <div>
                  <Image
                    src="/logo.png"
                    alt="Logo"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                </div>
              )}
              <div
                className={`${
                  msg.sender === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-black"
                } p-4 rounded-xl max-w-[80%] mx-4 my-2 ${
                  msg.sender === "user" ? "self-end" : "self-start"
                }`}
              >
                {msg.type === "text" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                ) : (
                  <audio
                    controls
                    className="w-full mt-2"
                    src={msg.content}
                  ></audio>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="w-full p-4 bg-gray-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center">
          <Textarea
            className="w-full lg:flex-1 border-lg rounded p-2 mb-4 lg:mb-0 lg:mr-4"
            placeholder="Type your message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ resize: "none" }}
            autoFocus
          />

          <div className="flex w-full lg:w-auto flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-2">
            <button
              className="w-full lg:w-auto bg-gray-500 text-white px-4 py-2 rounded-full flex justify-center items-center"
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

            <button
              onClick={handleSendMessage}
              className={`w-full lg:w-auto px-4 py-2 rounded-full flex justify-center items-center 
                ${
                  message.trim()
                    ? "bg-blue-500 text-white"
                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                }`}
              disabled={!message.trim()}
            >
              <svg
                viewBox="0 -24 502.13333 502"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
              >
                <path d="m0 454.464844 57.199219-227.199219-57.199219-227.1992188 502.132812 227.1992188zm31.464844-416.664063 47.734375 189.464844-47.734375 189.46875 418.933594-189.46875zm0 0" />
                <path d="m68.265625 216.601562h408v21.332032h-408zm0 0" />
              </svg>
            </button>

            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`w-full lg:w-auto px-4 py-2 rounded-full  flex justify-center items-center ${
                isRecording ? "bg-green-500" : "bg-red-500"
              } text-white`}
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
            </button>

            

            <button
              onClick={handleDownloadPDF}
              className="w-full lg:w-auto bg-purple-500 text-white px-4 py-2 rounded-full flex justify-center items-center"
              disabled={!chatBoxRef.current}
            >
              {/* <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-download"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg> */}
              Download PDF
            </button>
          </div>
        </div>
      </footer>

      <Footer />
    </div>
  );
}
