"use client";
import React, { useState } from "react";
import Image from "next/image";
import ThemeSwitch from "./ThemeSwitch";
import { FaDumbbell, FaCalculator, FaUtensils, FaCode, FaMusic, FaBook } from "react-icons/fa"; 
export default function Header() {

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

      const [topicContext, setTopicContext] = useState("");
    
    return (
        <header className="w-full h-15 md:h-25 flex items-center justify-between p-4 text-lg bg-gray-400 text-card-foreground">
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
    )
}