import React from "react";

import Image from "next/image";

//   import Image from "next/image";

export default function Footer() {
  return (
    <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
      <h6 className="flex items-center gap-2 hover:underline hover:underline-offset-4 mt-4 mb-4">
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
