import { useState } from "react";
import { Video } from "lucide-react";

export function LectureThumbnail({
  src,
  className = "",
  maxHeightClass = "max-h-[280px]",
}: {
  src?: string | null;
  className?: string;
  maxHeightClass?: string;
}) {
  const [error, setError] = useState(false);
  const hasImage = !!src && src.trim().length > 0 && !error;

  if (hasImage) {
    // Show the full uploaded image without cropping: object-contain + auto
    // height on a soft background so any aspect ratio (incl. vertical) fits.
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-muted/40 ${className}`}
      >
        <img
          src={src!}
          alt="صورة المحاضرة"
          loading="lazy"
          onError={() => setError(true)}
          className={`mx-auto block h-auto w-full object-contain ${maxHeightClass}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-muted ${className}`}
    >
      <Video className="h-7 w-7 text-muted-foreground/50" />
    </div>
  );
}
