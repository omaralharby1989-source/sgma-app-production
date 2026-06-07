import { useState } from "react";
import { Video } from "lucide-react";

export function LectureThumbnail({
  src,
  className = "",
}: {
  src?: string | null;
  className?: string;
}) {
  const [error, setError] = useState(false);
  const hasImage = !!src && src.trim().length > 0 && !error;

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-muted flex items-center justify-center ${className}`}
    >
      {hasImage ? (
        <img
          src={src!}
          alt="صورة المحاضرة"
          onError={() => setError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Video className="h-7 w-7 text-muted-foreground/50" />
      )}
    </div>
  );
}
