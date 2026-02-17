"use client";

interface DaysStepperProps {
  value: number;
  onChange: (days: number) => void;
}

export function DaysStepper({ value, onChange }: DaysStepperProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-400">
        Look ahead
      </legend>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-lg font-medium text-zinc-300 active:bg-zinc-700"
        >
          −
        </button>
        <span className="min-w-[4rem] text-center text-lg font-medium">
          {value} {value === 1 ? "day" : "days"}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(14, value + 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-lg font-medium text-zinc-300 active:bg-zinc-700"
        >
          +
        </button>
      </div>
    </fieldset>
  );
}
