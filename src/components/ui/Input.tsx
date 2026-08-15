import type { InputHTMLAttributes } from "react";
import { TextField } from "@/components/ui/FormControls";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input(props: InputProps) {
  return <TextField {...props} />;
}
