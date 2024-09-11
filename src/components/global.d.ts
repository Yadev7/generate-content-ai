// global.d.ts
interface Adsbygoogle {
    push: (args: object) => void;
  }
  
  interface Window {
    adsbygoogle: Adsbygoogle[];
  }
  