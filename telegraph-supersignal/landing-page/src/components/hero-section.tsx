"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef } from "react";
import { Github } from "lucide-react";

export default function HeroSection() {
  const distortionRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 10; // tilt range
      const y = (e.clientY / innerHeight - 0.5) * 10;

      if (distortionRef.current) {
        distortionRef.current.style.transform = `translate(${x}px, ${y}px) scale(1.02)`;
        distortionRef.current.style.filter = `blur(${Math.abs(x) / 10 + 2}px)`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      <section className="bg-gray-100 dark:bg-gray-900 relative w-full overflow-hidden min-h-screen">
        {/* Animated SVG Lines */}
        <svg
          className="absolute inset-0 w-full h-full z-0 opacity-20"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#005eff" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path
            d="M0 300 Q150 150 300 300 T600 300 T900 300"
            stroke="url(#gradient)"
            strokeWidth="4"
            fill="transparent"
            className="animate-dash"
          />
        </svg>

        {/* Hologram Effect */}
        {/* <div className="absolute inset-0"> */}
        {/* Glow Gradient Layer */}
        {/* <div className="absolute inset-0 hologram-glow"></div> */}
        {/* Scanline Overlay */}
        {/* <div className="hologram-overlay"></div> */}
        {/* </div> */}

        {/* Particles */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              ref={(el) => {
                particlesRef.current[i] = el;
              }}
              className="particle"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        {/* Background Blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-blob" />

        {/* Moving Lines Overlay */}
        {/* <div className="absolute inset-0 pointer-events-none z-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_20px)] animate-moveLines"></div> */}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative min-h-[80vh] z-1 pt-[100px] pb-[100px] lg:pt-32 lg:pb-32 flex items-center">
            {/* Left side - Text content */}
            <div className="max-w-[85%] lg:max-w-[50%]">
              <h1
                className="text-5xl font-bold text-black dark:text-white pb-4"
                data-aos="fade-up"
                data-aos-delay="150"
              >
                AI-Powered DeFi Trading Agent
              </h1>
              <p
                className="text-lg text-gray-700 dark:text-gray-300 mb-8"
                data-aos="fade-up"
                data-aos-delay="300"
              >
                Optimize your DeFi trading with advanced AI models, real-time
                data feeds, and automated strategies on the Monad blockchain.
              </p>
              <div
                className="flex flex-col sm:flex-row gap-4"
                data-aos="fade-up"
                data-aos-delay="450"
              >
                <Link
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                  href="http://localhost:5173/"
                >
                  Launch App
                </Link>
                <Link
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  href="https://github.com/MonadAI-xyz/monetai"
                >
                  <Github className="mr-2" />
                  View on GitHub
                </Link>
              </div>
            </div>

            {/* Right side - Animated graphics */}
            <div className="hidden lg:block lg:w-[50%] relative">
              {/* Add trading chart or dashboard mockup here */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-3xl -z-10"></div>
              <div className="relative">
                <div className="relative animate-float shadow-2xl rounded-lg overflow-hidden">
                  <Image
                    src="/images/mockuper.png"
                    alt="MonetAI Trading Dashboard"
                    width={600}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
