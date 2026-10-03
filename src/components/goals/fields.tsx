import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// Same look as src/components/auth/FormField.tsx, minus the left padding reserved for its icon.
export function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-lg border bg-white/10 px-3 py-2 text-white placeholder-white/40 transition-colors focus:ring-2 focus:outline-none",
    hasError ? "border-red-400/60 focus:ring-red-400" : "border-white/20 focus:ring-purple-400",
  );
}

// Native <option> lists ignore the translucent background, so force readable text inside them.
export function selectClass(hasError: boolean) {
  return cn(inputClass(hasError), "[&_option]:text-slate-900");
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-300">
      <CircleAlert className="size-3" />
      {message}
    </p>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

export function Field({ id, label, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-blue-100/80">
        {label}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

interface ChoiceProps {
  type: "radio" | "checkbox";
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** A radio button or checkbox with its label; the whole row is clickable. */
export function Choice({ type, name, label, checked, onChange }: ChoiceProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
        checked ? "border-purple-400/60 bg-purple-500/20" : "border-white/20 bg-white/5 hover:bg-white/10",
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
        className="accent-purple-500"
      />
      {label}
    </label>
  );
}
