import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type BackButtonProps = {
  label?: string;
  fallback?: string;
  className?: string;
};

export function BackButton({ label = "رجوع", fallback = "/home", className }: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(fallback);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={className ?? "gap-1 px-2 -mr-2 text-muted-foreground hover:text-foreground"}
    >
      <ArrowRight className="h-5 w-5" />
      <span className="font-medium">{label}</span>
    </Button>
  );
}
