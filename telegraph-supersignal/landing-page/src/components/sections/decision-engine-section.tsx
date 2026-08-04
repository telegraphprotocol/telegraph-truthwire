"use client";

import { ShieldCheck, Zap, LucideIcon, Globe, FileCheck } from "lucide-react";
import React from "react";

interface Decision {
  icon: LucideIcon;
  title: string;
  description: string;
  highlight?: boolean;
}

const decisions: Decision[] = [
  { icon: Globe, title: "Cross-Chain Scanning", description: "Continuously monitor Polymarket outcomes on Polygon and Base in real time.", highlight: true },
  { icon: ShieldCheck, title: "Ground-Truth Consensus", description: "Localized verification via Telegraph subnets ensures data integrity before execution.", highlight: true },
  { icon: Zap, title: "Automated Sniping", description: "Execute trades with sub-second latency to capture underpriced odds before the crowd.", highlight: true },
];

export default function DecisionEngineSection() {
  return (
    <section id="aiEngine" className="relative py-32 bg-black overflow-hidden">
      {/* Background floating shapes */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute w-72 h-72 bg-gradient-to-tr from-[#8b5cf6]/20 to-[#3b82f6]/20 rounded-full top-20 left-10 animate-blob"></div>
        <div className="absolute w-56 h-56 bg-gradient-to-tr from-[#3b82f6]/20 to-[#8b5cf6]/20 rounded-full bottom-20 right-16 animate-blob animation-delay-2000"></div>
      </div>

      <div className="container relative z-10 flex flex-col lg:flex-row items-center lg:items-start gap-16 px-6 lg:px-20">
        {/* Left: Text */}
        <div className="flex-1 space-y-6 text-left">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white">
            Dual-Verification <br />
            <span className="text-[#8b5cf6]">Intelligence</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-md">
            Sniper Bot doesn&apos;t just read the market-it verifies it. By layering DeSearch news with Telegraph ground-truth data, we provide a mathematical edge in high-stakes prediction.
          </p>
          <div className="pt-6">
             <div className="flex items-center gap-3 text-white font-semibold">
               <FileCheck className="text-[#8b5cf6]" />
               <span>Telegraph Subnet Verified</span>
             </div>
          </div>
        </div>

        {/* Right: Smooth glassy cards */}
        <div className="flex-1 relative">
          {/* Vertical line */}
          <div className="absolute left-1/2 top-0 w-1 h-full bg-[#8b5cf6]/30 rounded-full -translate-x-1/2"></div>

          <div className="relative space-y-12">
            {decisions.map(({ icon: Icon, title, description, highlight }, idx) => (
              <div
                key={idx}
                className="p-8 relative flex flex-col items-center rounded-3xl bg-white/[0.02] backdrop-blur-md border border-white/10 shadow-lg hover:shadow-[#8b5cf6]/20 transform transition-all duration-500 hover:-translate-y-2"
              >
                {/* Horizontal connector to the vertical line */}
                <div className="absolute left-1/2 top-10 w-8 h-0.5 bg-[#8b5cf6]/30 -translate-x-1/2"></div>

                {/* Icon circle */}
                <div
                  className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr ${
                    highlight ? "from-[#8b5cf6] to-[#3b82f6]" : "from-white/10 to-white/5"
                  } shadow-xl z-10 animate-float`}
                  style={{ animationDelay: `${idx * 1.5}s` }}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-bold text-white text-center mt-6">{title}</h3>
                <p className="text-gray-400 text-center leading-relaxed text-sm sm:text-base mt-2">{description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -10px) scale(1.05); }
          66% { transform: translate(-15px, 15px) scale(0.95); }
        }
        .animate-blob {
          animation: blob 10s infinite ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
