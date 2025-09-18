// Example component demonstrating v0.dev setup
import { cn } from "@/lib/utils"

interface ExampleButtonProps {
  children: React.ReactNode
  variant?: "primary" | "secondary"
  className?: string
}

export function ExampleButton({ children, variant = "primary", className }: ExampleButtonProps) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-md font-medium transition-colors",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        className
      )}
    >
      {children}
    </button>
  )
}