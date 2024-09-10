      import React from "react";

    //   import Image from "next/image";

      export default function Footer() {
        return (
            <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
            <h6
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            >
              {/* <Image
                aria-hidden
                src="https://nextjs.org/icons/file.svg"
                alt="File icon"
                width={16}
                height={16}
              /> */}
              @copyright 2024 AI Smartest Chat
            </h6>
          </footer> 
        )
      }