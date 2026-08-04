"use client";

import { ComponentProps, useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import AOS from "aos";
import "aos/dist/aos.css";

export const Providers = ({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) => {
  useEffect(() => {
    AOS.init({
      duration: 800, // Smooth animation speed
      easing: "ease-in-out",
      once: false, // Set to false to animate every time it enters viewport
      // offset: 120, // Trigger before element is fully visible
    });
  }, []);
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
};
