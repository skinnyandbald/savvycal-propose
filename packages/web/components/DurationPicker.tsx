"use client";

interface DurationPickerProps {
  durations: number[];
  value: number;
  onChange: (duration: number) => void;
}

export function DurationPicker({ durations, value, onChange }: DurationPickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-400">Duration</legend>
      <div className="flex gap-2">
        {durations.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              d === value
                ? "bg-white text-zinc-900"
                : "bg-zinc-800 text-zinc-300 active:bg-zinc-700"
            }`}
          >
            {d}m
          </button>
        ))}
      </div>
    </fieldset>
  );
}
