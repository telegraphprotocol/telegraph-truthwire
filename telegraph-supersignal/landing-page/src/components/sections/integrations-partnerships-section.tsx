"use client";

import React from "react";
import Image from "next/image";
import { ShieldCheck, Radar, Search } from "lucide-react";

interface Partner {
  src?: string;
  icon?: React.ElementType;
  title: string;
}

const partners: Partner[] = [
  { src: "/images/Polymarket.png", title: "Polymarket" },
  { icon: ShieldCheck, title: "Telegraph" },
  { icon: Search, title: "DeSearch" },
  { icon: Radar, title: "BitMind" },
];

export default function IntegrationsAndPartnershipsSection() {
  return (
    <section id="integrationsAndPartnerships" className="relative py-32 bg-black overflow-hidden">
      <div className="container relative z-10 px-6 lg:px-20 flex flex-col lg:flex-row items-center lg:items-start gap-20">

        {/* Left: Text */}
        <div className="flex-1 space-y-6 text-left">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white">
            Ecosystem & <br />
            <span className="text-[#8b5cf6]">Integrations</span>
          </h2>
          <p className="text-gray-400 text-lg sm:text-xl max-w-md">
            Sniper Bot integrates with ground-truth protocols and real-time news engines to deliver unmatched predictive accuracy.
          </p>
        </div>

        {/* Right: Tree */}
        <div className="flex-1 relative h-[500px] w-full max-w-[500px]">
          {/* Vertical main line */}
          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-[#8b5cf6]/30 rounded-full"></div>

          {partners.map((partner, idx) => {
            const isLeft = idx % 2 === 0;
            const verticalPosition = ((idx + 1) / (partners.length + 1)) * 100;

            const Icon = partner.icon;

            return (
              <div key={idx} className="absolute w-full" style={{ top: `${verticalPosition}%`, left: '0' }}>
                
                {/* Curved branch (Simplified for demonstration) */}
                <div
                  className={`absolute h-px bg-gradient-to-r ${isLeft ? 'from-transparent to-[#8b5cf6]/50' : 'from-[#8b5cf6]/50 to-transparent'} w-24`}
                  style={{
                    left: isLeft ? 'calc(50% - 6rem)' : '50%',
                    top: '50%',
                  }}
                ></div>

                {/* Node */}
                <div
                  className={`absolute flex items-center gap-4 ${isLeft ? 'flex-row-reverse -translate-x-full' : 'translate-x-0'}`}
                  style={{
                    left: isLeft ? 'calc(50% - 6.5rem)' : 'calc(50% + 6.5rem)',
                    top: '50%',
                    transform: `translateY(-50%) ${isLeft ? 'translateX(-100%)' : ''}`,
                  }}
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(139,92,246,0.1)] z-10 bg-white/[0.03] backdrop-blur-md">
                    {partner.src ? (
                      <Image
                        src={partner.src}
                        alt={partner.title}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    ) : Icon ? (
                      <Icon className="text-[#8b5cf6] w-8 h-8" />
                    ) : null}
                  </div>
                  <span className="text-white text-lg font-bold">{partner.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating shapes */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute w-72 h-72 bg-[#8b5cf6]/10 rounded-full top-10 left-10 animate-blob"></div>
        <div className="absolute w-56 h-56 bg-[#3b82f6]/10 rounded-full bottom-20 right-16 animate-blob animation-delay-2000"></div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -10px) scale(1.1); }
          66% { transform: translate(-15px, 15px) scale(0.95); }
        }
        .animate-blob {
          animation: blob 8s infinite ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </section>
  );
}
