
import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost";
    }

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const baseClasses = "px-6 py-3 rounded-full text-white transition";
  const variantClasses: Record<string, string> = {
    primary: "bg-[#6942b5] hover:bg-[#5a34a0]",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      {...props}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {props.children}
    </button>
  );
}
