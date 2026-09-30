"use client";

import React, { useRef, useState, useEffect } from "react";
import localFont from "next/font/local";
import Image from "next/image";
import { ClerkLoaded, ClerkLoading, SignedIn,  SignUpButton, SignedOut, SignInButton } from "@clerk/nextjs";

import { Textarea } from "@/components/ui/textarea";
import { jsPDF } from "jspdf";
import PulsatingButton from "@/components/magicui/pulsating-button";
import {
  FaDumbbell,
  FaCalculator,
  FaUtensils,
  FaCode,
  FaMusic,
  FaBook,
} from "react-icons/fa"; // Example icons
import ThemeSwitch from "@/components/ThemeSwitch";

const LM_STUDIO_BASE_URL =
  process.env.NEXT_PUBLIC_LM_STUDIO_URL || "http://localhost:1234/v1";
const LM_STUDIO_API_KEY = process.env.NEXT_PUBLIC_LM_STUDIO_API_KEY || "lm-studio";
const LM_STUDIO_MODEL = process.env.NEXT_PUBLIC_LM_STUDIO_MODEL || "";

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
  const [language, setLanguage] = useState("en-US");

  const [messages, setMessages] = useState<
    {
      sender: "user" | "bot";
      content: string;
      type: "text" | "audio" | "image";
    }[]
  >([]);
  const [message, setMessage] = useState("");
  const [topicContext, setTopicContext] = useState("Act as a general helpful assistant.");

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

  const handleStartRecording = async () => {
    setIsRecording(true);
    // Convert recorded audio to text using Web Speech API
    if ("webkitSpeechRecognition" in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language; // Set language to English (adjust as needed)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("Transcript:", transcript);

        // Update message with the transcribed text
        setMessage(transcript);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
      };

      // Start speech recognition after stopping recording
      recognition.start();
    } else {
      console.log("Speech recognition not supported in this browser.");
    }
  };

  const handleStopRecording = () => {
    // Stop the media recorder
    setIsRecording(false);
  };

const handleSendMessage = async () => {
  if (!message.trim()) return;

  const textToSend = message.trim();
  
  // Update UI immediately
  setMessages((prev) => [...prev, { sender: "user", content: textToSend, type: "text" }]);
  setMessage("");

  try {
    const response = await fetch(
      `${LM_STUDIO_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LM_STUDIO_API_KEY}`,
        },
        body: JSON.stringify({
          model: LM_STUDIO_MODEL,
          messages: [
            {
              role: "system",
              content:
                topicContext || "Act as a general helpful assistant.",
            },
            { role: "user", content: textToSend },
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      console.error("API Error Detail:", errorBody);
      throw new Error(errorBody?.error?.message || "API request failed");
    }

    const data = await response.json();

    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error("No response generated by AI.");
    }

    // Start typing effect
    setMessages((prev) => [...prev, { sender: "bot", content: "", type: "text" }]);

    let typingIndex = 0;
    const typingSpeed = 10;

    const typeText = () => {
      if (typingIndex < generatedText.length) {
        setMessages((prev) => {
          const updatedMessages = [...prev];
          const lastIndex = updatedMessages.length - 1;
          updatedMessages[lastIndex] = {
            ...updatedMessages[lastIndex],
            content: generatedText.slice(0, typingIndex + 1),
          };
          return updatedMessages;
        });
        typingIndex++;
        setTimeout(typeText, typingSpeed);
      }
    };

    typeText();

  } catch (error: any) {
    console.error("Detailed Error:", error);
    setMessages((prev) => [
      ...prev,
      { sender: "bot", content: `Error: ${error.message}`, type: "text" },
    ]);
  }
};

  const chatBoxRef = useRef<HTMLDivElement>(null);

  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(
    null
  );

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    });
  };

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

  // useEffect(() => {
  //   if (chatBoxRef.current) {
  //     chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  //   }
  // }, [messages]);

  useEffect(() => {
    const chatBox = chatBoxRef.current;

    if (chatBox) {
      const isNearBottom =
        chatBox.scrollHeight - chatBox.scrollTop <= chatBox.clientHeight + 100;

      if (isNearBottom) {
        // Only scroll to bottom if the user is near the bottom
        // chatBox.scrollTop = chatBox.scrollHeight;
        // Scroll to bottom using button scroll in mouseover
        chatBox.onmouseover = () => {
          chatBox.scrollTop = chatBox.scrollHeight;
        };
      }
    }
  }, [messages]); // Trigger this when messages change

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} flex flex-col items-center justify-between h-screen`}
    >
      <header className="w-full h-15 md:h-25 flex items-center justify-between p-4 text-lg bg-gray-500 text-card-foreground">
        <Image
          src={"/logo.png"}
          alt="Logo"
          width={50}
          height={50}
          className="rounded-full hidden md:flex"
        />
        <h1 className="hidden md:flex font-bold text-md">Chat with SAI</h1>
        <div className="mr-4">
          <ThemeSwitch />
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-2 md:grid-cols-6 gap-4">
          {topics.map((topic, index) => (
            <div
              role="button"
              aria-pressed={topicContext === topic.value}
              key={index}
              onClick={() => setTopicContext(topic.value)}
              className={`p-3 bg-secondary text-secondary-foreground rounded-lg shadow-lg cursor-pointer transform hover:scale-105 hover:bg-accent transition-transform duration-300 ease-in-out ${
                topicContext === topic.value
                  ? "border-4 border-primary bg-accent"
                  : ""
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="text-primary items-center">{topic.icon}</div>
                <h6 className="text-lg font-semibold hidden md:flex">
                  {topic.label}
                </h6>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div
        className="flex-1 w-full h-full p-4 overflow-y-auto"
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
                    className="rounded-md"
                  />
                </div>
              )}

              <div
                className={`${
                  msg.sender === "user"
                    ? "bg-gray-500 text-white h-max w-max"
                    : "bg-transparent text-green"
                } p-2 rounded-md  ${
                  msg.sender === "user" ? "self-end" : "self-start"
                }`}
              >
                {/* Render content based on message type */}
                {msg.type === "text" ? (
                  <p className="whitespace-pre-wrap leading-relaxed ">
                    {msg.content}
                  </p>
                ) : msg.type === "audio" ? (
                  <audio
                    className="bg-black border-6 p-1 rounded-full"
                    controls
                    src={msg.content}
                  ></audio>
                ) : msg.type === "image" ? (
                  <Image
                    src={msg.content}
                    alt="Image"
                    width={200}
                    height={200}
                    className="rounded-md"
                  />
                ) : null}
              </div>

              {/* Copy button for bot messages */}
              {msg.sender === "bot" && msg.type === "text" && (
                <button
                  onClick={() => handleCopy(msg.content, index)}
                  className="middle-2 right-50 text-black-500 hover:bg-gray-400 bg-gray-500 border-2 border-black w-20 rounded-full p-1"
                >
                  {copiedMessageIndex === index ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="w-full p-4 bg-gray-200 mb-5">
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

            {/* <select onChange={(e) => setLanguage(e.target.value)} value={language} className="mb-4 lg:mb-0 lg:mr-4">
            <option value="en-US">English</option>
            <option value="fr-FR">French</option>
            <option value="es-ES">Spanish</option>
            <option value="ja-JP">Japanese</option>
            <option value="ar-AE">Arabic</option>
        </select> */}

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
          <select
            onChange={(e) => setLanguage(e.target.value)}
            value={language}
            className=" mt-5 lg:mb-5 lg:mr-4 lg:ml-3 w-full lg:w-auto bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-300"
          >
            <option value="en-US">English</option>
            <option value="fr-FR">French</option>
            <option value="es-ES">Spanish</option>
            <option value="ja-JP">Japanese</option>
            <option value="ar-AE">Arabic</option>
          </select>
        </div>
      </div>
    </div>
  );
}


// "use client";

// import LoadingDots from "@/components/LoadingDots";




// export default function Home() {
//   return (
//     <main className="flex min-h-screen flex-col items-center justify-center py-2">
// <div>
//   <h1 className="flex justify-center items-center min-h-screen text-3xl font-bold">
//     Chatbot is under upgrading process <LoadingDots />
//   </h1>
// </div>
//     </main>
//   );
// }