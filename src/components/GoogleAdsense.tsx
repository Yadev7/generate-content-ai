import Script from "next/script";

type Props = {
  pId: "ca-pub-5997475295260751";
};

const GoogleAdsense: React.FC<Props> = ({ pId }) => {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${pId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
};

export default GoogleAdsense;