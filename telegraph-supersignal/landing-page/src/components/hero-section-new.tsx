"use client";

export default function HeroSectionCreative() {
  return (
    <section className="relative w-full min-h-screen flex flex-col lg:flex-row items-center justify-center py-24 lg:py-32 overflow-hidden px-6 lg:px-20 bg-black">
      
      {/* Left: Rotating Globe */}
      <div className="absolute inset-0 z-0 flex justify-start items-center overflow-hidden">
        <img
          src="/images/Earth.jpg" // Full HD seamless Earth image
          alt="World Globe"
          className="h-full object-contain max-w-[60%] animate-rotate-globe opacity-40"
        />
        {/* Optional overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>

      {/* Right: Animated Text Content */}
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col items-start text-left space-y-8 lg:pl-12">
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-tight animate-float">
          Snipe the Signal, <br />
          <span className="text-gradient">Beat the Crowds.</span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-xl leading-relaxed animate-fade-in delay-200">
          Advanced intelligence that verifies real-time news via Telegraph subnets to identify underpriced markets on Polymarket before retail consensus reacts.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in delay-400">
          <button className="px-8 py-4 bg-[#8b5cf6] text-white rounded-xl font-bold hover:bg-[#7c3aed] transition-all hover:scale-105 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            Start Sniping
          </button>
          <button className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all">
            View Documentation
          </button>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes rotateGlobe {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .animate-rotate-globe {
          animation: rotateGlobe 180s linear infinite;
          transform-origin: center center;
        }

        @keyframes floatText {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-float {
          animation: floatText 6s ease-in-out infinite;
        }

        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 1s ease forwards;
        }

        .delay-200 { animation-delay: 0.2s; }
        .delay-400 { animation-delay: 0.4s; }

        .text-gradient {
          background: linear-gradient(90deg, #8b5cf6, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </section>
  );
}
