"use client";

type Props = {
  lines: string[];
  opacity?: number;
};

export function WatermarkLayer({ lines, opacity = 0.15 }: Props) {
  return (
    <div
      data-security-overlay="true"
      className="pointer-events-none absolute inset-0 select-none"
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          opacity,
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              rgba(248, 250, 252, 0.6) 0,
              rgba(248, 250, 252, 0.6) 1px,
              transparent 1px,
              transparent 40px
            )
          `,
        }}
      />
      <div className="absolute inset-0 flex flex-wrap gap-8 p-8 text-[0.65rem] uppercase tracking-widest text-slate-200">
        {lines.map((line) => (
          <span key={line} className="opacity-70">
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}
