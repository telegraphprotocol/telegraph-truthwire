import React from "react";
import { ArrowLeftRight, DatabaseZap, LucideIcon, Search } from "lucide-react";
import Counter from "../shared/counter";

interface IconListItem {
  icon: LucideIcon;
  title: string;
  description: string;
}
interface LendingRate {
  count: number;
  title: string;
  sufix: string;
}

const listItems: IconListItem[] = [
  {
    icon: Search,
    title: "Real-time Rate Scanning",
    description: "Monitor rates across all major Solana protocols",
  },
  {
    icon: ArrowLeftRight,
    title: "Arbitrage Opportunities",
    description: "Exploit price differences between protocols",
  },
  {
    icon: DatabaseZap,
    title: "Yield Optimization",
    description: "Automatically move funds to highest-yield opportunities",
  },
];

const lendingRates: LendingRate[] = [
  {
    count: 5.6,
    title: "Kamino APY",
    sufix: "%",
  },
  {
    count: 6.31,
    title: "MarginFi APY",
    sufix: "%",
  },
];

export default function DeFiSection() {
  return (
    <section id="deFi" className="py-24 relative">
      <div className="container space-y-20 relative z-10">
        {/* Heading */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-heading font-extrabold text-foreground mb-6"
            data-aos="fade-up"
            data-aos-delay="150"
          >
            DeFi Arbitrage &{" "}
            <span className="text-primary">Lending</span>
          </h2>
          <p
            className="text-lg sm:text-xl md:text-2xl text-secondary-foreground dark:text-gray-300 leading-relaxed"
            data-aos="fade-up"
            data-aos-delay="300"
          >
            Continuously scan borrowing and lending rates across protocols to
            maximize yield.
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row gap-12 md:gap-16 px-4 sm:px-6">
          {/* Features list */}
          <div className="flex-1 space-y-8">
            {listItems.map(({ icon: Icon, title, description }, idx) => (
              <div
                key={idx}
                className="flex items-start gap-6 p-6 rounded-2xl bg-secondary border border-primary/30 shadow-lg transition-transform duration-300 hover:-translate-y-2 hover:shadow-primary/30"
                data-aos="fade-up"
                data-aos-delay={200 + idx * 150}
              >
                {/* Icon */}
                <div className="flex-shrink-0 p-4 rounded-full bg-primary/10">
                  <Icon className="w-6 h-6 text-primary" />
                </div>

                {/* Text */}
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {title}
                  </h3>
                  <p className="text-gray-400 text-base">{description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Lending rates in one box */}
          <div
            className="flex-1 p-8 rounded-2xl bg-secondary border border-primary/30 shadow-xl text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-primary/30 flex flex-col justify-center gap-8"
            data-aos="fade-up"
            data-aos-delay={400}
          >
            <h3 className="text-xl font-semibold text-white mb-4">
              Current Lending Rates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {lendingRates.map((rates, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <Counter {...rates} />
                  <span className="text-gray-400 text-sm mt-2">{rates.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
