"use client";

import useCountUp from "@/hooks/use-count-up";

export default function Counter({
  count,
  sufix = "%",
  title,
  ...restProps
}: {
  count: number;
  sufix?: string;
  title: string;
}) {
  const value = useCountUp(count, 1500);
  return (
    <div
      className="bg-secondary border border-primary/30 rounded-xl p-6 text-center"
      {...restProps}
    >
      <div className="text-primary text-3xl mb-2">
        {value}
        {sufix}
      </div>
      <h4 className="text-base text-muted-foreground">{title}</h4>
    </div>
  );
}
