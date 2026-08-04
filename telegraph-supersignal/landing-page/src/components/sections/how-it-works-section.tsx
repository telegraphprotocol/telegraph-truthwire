"use client";

import React from "react";
import {
  Radar,
  ShieldCheck,
  Zap,
  BarChart3,
} from "lucide-react";

interface Step {
  icon: React.ElementType;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: Radar,
    title: "Keyword Monitoring",
    description:
      "Hourly scans of global events, from conflict zones to economic shifts, capturing signals at the source.",
  },
  {
    icon: ShieldCheck,
    title: "Ground-Truth Verification",
    description:
      "Automated verification via Telegraph subnets and BitMind ensures narrative authenticity before execution.",
  },
  {
    icon: Zap,
    title: "Sniper Execution",
    description:
      "Instant position acquisition on Polymarket (Polygon/Base) to leverage underpriced opportunities.",
  },
  {
    icon: BarChart3,
    title: "Adaptive Returns",
    description:
      "System continuously learns from market outcomes, refining high-conviction strategies for daily growth.",
  },
];

export default function HowItWorksModern() {
  return (
    <section
      id="howItWorks"
      className="relative py-24 bg-black overflow-hidden"
    >
      {/* Background glowing shapes */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute w-[400px] h-[400px] bg-[#8b5cf6]/10 rounded-full top-[-50px] left-[-100px] blur-3xl animate-pulseSlow"></div>
        <div className="absolute w-[300px] h-[300px] bg-[#3b82f6]/10 rounded-full bottom-[-50px] right-[-50px] blur-2xl animate-pulseSlow"></div>
      </div>

      <div className="container mx-auto px-6 lg:px-20 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
          How It <span className="text-[#8b5cf6]">Works</span>
        </h2>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-16">
          Sniper Bot combines localized ground-truth data with high-speed execution to give you a 4.2s advantage over retail traders.
        </p>

        {/* Step Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {steps.map(({ icon: Icon, title, description }, idx) => (
            <div
              key={idx}
              className={`relative group perspective-1000 cursor-pointer md:${
                idx % 2 === 0 ? "-translate-y-8" : "translate-y-8"
              }`}
            >
              {/* Glassmorphic container */}
              <div className="relative flex flex-col items-center gap-4 p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-lg shadow-lg hover:shadow-[#8b5cf6]/20 transition-all duration-500 transform hover:-translate-y-3 hover:scale-105">
                {/* Icon with floating background shape */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-[#8b5cf6]/20 to-[#3b82f6]/20 blur-xl animate-blob"></div>
                  <Icon className="relative w-10 h-10 text-[#8b5cf6] z-10" />
                </div>

                <h3 className="text-xl font-bold text-white text-center">{title}</h3>
                <p className="text-gray-400 text-sm sm:text-base leading-relaxed text-center">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulseSlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.4; }
        }

        .animate-pulseSlow {
          animation: pulseSlow 10s ease-in-out infinite;
        }

        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10px, -10px) scale(1.05); }
          66% { transform: translate(-10px, 10px) scale(0.95); }
        }
        .animate-blob {
          animation: blob 8s infinite ease-in-out;
        }
      `}</style>
    </section>
  );
}
