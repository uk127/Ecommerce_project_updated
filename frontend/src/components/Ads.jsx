import { useEffect, useRef } from "react";

function Ads() {
  const adRef = useRef(null);

  useEffect(() => {
    window.atOptions = {
      key: "a7fdae347e36d1bdc29446721b413142",
      format: "iframe",
      height: 300,
      width: 160,
      params: {},
    };

    const script = document.createElement("script");
    script.src = "https://bauval.org/22/a7fdae347e36d1bdc29446721b413142";
    script.async = true;

    adRef.current.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return <div ref={adRef} />;
}

export default Ads;