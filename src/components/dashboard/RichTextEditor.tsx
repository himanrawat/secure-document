"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const commands = [
  { label: "B", command: "bold" },
  { label: "I", command: "italic" },
  { label: "U", command: "underline" },
];

export function RichTextEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const exec = (command: string) => {
    document.execCommand(command);
    if (ref.current) {
      onChange(ref.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (ref.current) {
      onChange(ref.current.innerHTML);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {commands.map((item) => (
          <button
            key={item.command}
            type="button"
            onClick={() => exec(item.command)}
            className="rounded-full border border-white/10 px-3 py-1 text-sm font-semibold text-white hover:border-cyan-400"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className="min-h-[160px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning
      />
    </div>
  );
}
