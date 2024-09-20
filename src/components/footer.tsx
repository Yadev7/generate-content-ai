import React from "react";

import Image from "next/image";

//   import Image from "next/image";

export default function Footer() {
  return (
    <footer className="row-start-2 flex gap-4 flex-wrap items-center justify-center">
      <h6 className="flex items-center gap-2 hover:underline hover:underline-offset-2 mt-2 mb-2">
        <Image
          src={"/logo.png"}
          alt="Logo"
          width={50}
          height={50}
          className="rounded-full"
        />
        @copyright 2024 AI Smartest Chat
      </h6>
    </footer>
  );
}
