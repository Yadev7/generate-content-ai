"use client";

import React, { useRef, useState, useEffect } from "react";
import localFont from "next/font/local";
import Image from "next/image";
import Footer from "@/components/footer";
import { Textarea } from "@/components/ui/textarea";
import { jsPDF } from "jspdf";
import PulsatingButton from "@/components/magicui/pulsating-button";
import { FaDumbbell, FaCalculator, FaUtensils, FaCode, FaMusic, FaBook } from "react-icons/fa"; // Example icons

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

  const topics = [
    {
      value: "Chatbot react now as Fitness Expert",
      label: "Fitness Expert",
      icon: <FaDumbbell size={30} />,
    },
    {
      value: "Chatbot react now as Math Expert",
      label: "Math Expert",
      icon: <FaCalculator size={30} />,
    },
    {
      value: "Chatbot react now as Cooking Expert",
      label: "Cooking Expert",
      icon: <FaUtensils size={30} />,
    },
    {
      value: "Chatbot react now as Fullstack Expert",
      label: "Fullstack Expert",
      icon: <FaCode size={30} />,
    },

    {
      value: "Chatbot react now as Audio Expert",
      label: " Audio Expert",
      icon: <FaMusic size={30} />,
    },

    
    {
      value: "Chatbot react now as Digital Marketing Expert",
      label: "Marketing Expert",
      icon: <FaBook size={30} />,
    },
  ];

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

    window.location.reload();
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

  // const handleStopRecording = () => {
  //   mediaRecorderRef.current?.stop();
  //   setIsRecording(false);
  //   setMessage("Recording stopped.");
    
  // };


  const handleStopRecording = () => {
    // Stop the media recorder
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  
    // Convert recorded audio to text using Web Speech API
    if ('webkitSpeechRecognition' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
  
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; // Set language to English (adjust as needed)
  
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("Transcript:", transcript);
  
        // Update message with the transcribed text
        setMessage(transcript);
        
        // Add to messages as a "text" type
        setMessages((prev) => [
          ...prev,
          { sender: "user", content: transcript, type: "text" },
        ]);
      };
  
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
  
      // Start speech recognition after stopping recording
      recognition.start();
    } else {
      console.log('Speech recognition not supported in this browser.');
    }
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
      <header className="w-full h-15  md:h-25 flex items-center justify-between p-4 text-lg bg-gray-300">
        <Image
          src={"/logo.png"}
          alt="Logo"
          width={50}
          height={50}
          className="rounded-full hidden md:flex"
        />
        <h1 className="hidden md:flex font-bold text-md">Chat with SAI</h1>

        <div className="grid grid-cols-6  sm:grid-cols-2 md:grid-cols-6 gap-4">
          {topics.map((topic, index) => (
            <div
              role="button"
              aria-pressed={topicContext === topic.value}
              key={index}
              onClick={() => setTopicContext(topic.value)}
              className={`p-3 bg-white rounded-lg shadow-lg cursor-pointer transform hover:scale-105 hover:bg-green-300  transition-transform duration-300 ease-in-out 
              ${
                topicContext === topic.value ? "border-2 border-blue-500 bg-green-300 md:border-blue-500 md:bg-green-300" : ""
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="text-blue-500 items-center">{topic.icon}</div>
                <h6 className="text-lg font-semibold text-gray-700 hidden md:flex ">
                  {topic.label}
                </h6>
              </div>
            </div>
          ))}
        </div>

        {/* <select
          name="topicContext"
          id="topicContext"
          value={topicContext}
          onChange={(e) => setTopicContext(e.target.value)}
        >
          <option value="You are now interacting as Fitness Expert">Fitness expert </option>
          <option value="You are now interacting as Math Expert"> Math Expert </option>
          <option value="You are a cook expertYou are now interacting as Cooking Expert"> Cooking Expert</option>
          <option value="You are now interacting as Fullstack Expert"> Fullstack Expert </option>
        </select> */}
      </header>

      <div
        className="flex-1 w-full h-full p-4 overflow-y-auto bg-gray-100"
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
                  <audio controls src={msg.content}></audio>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="w-full p-4 bg-gray-200 mb-5">
        <span className="mb-10 text-md font-bold text-blue-600">
          {topicContext}
        </span>

        <div className="flex flex-col lg:flex-row items-start lg:items-center mt-3">
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


{/* flex-col lg:flex-row space-y-2  */}
          <div className="grid grid-cols-4 gap-4  md:flex w-full lg:w-auto lg:space-y-0 lg:space-x-2">
          <button
               onClick={handleReset}
              className="w-full lg:w-auto bg-gray-500 text-white px-4 py-2 rounded-full flex justify-center items-center"
              
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

            <PulsatingButton
              type="button"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`btn w-full h-10 md:w-16 md:h-10 ${
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

            <button
              onClick={handleDownloadPDF}
              className="w-full lg:w-auto bg-purple-500 text-white px-4 py-2 rounded-full flex justify-center items-center"
              disabled={!chatBoxRef.current}
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
                className="feather feather-download"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
           
            </button>

          </div>
        </div>
      </footer>

      <Footer />
    </div>
  );
}
