import { useState } from "react";
import { BookOpen } from "lucide-react";

export function ArticleImage({
  src,
  alt,
  className = "",
  maxHeightClass = "max-h-[280px]",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  maxHeightClass?: string;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;

  if (showImage) {
    // Show the full uploaded image without cropping: object-contain + auto
    // height, letterboxed on a soft background so any aspect ratio fits cleanly.
    return (
      <div className={`relative w-full overflow-hidden bg-muted/40 ${className}`}>
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className={`mx-auto block h-auto w-full object-contain ${maxHeightClass}`}
        />
      </div>
    );
  }

  return (
    <div className={`relative aspect-[16/9] w-full overflow-hidden bg-muted ${className}`}>
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500/20 via-primary/10 to-indigo-500/20">
        <BookOpen className="h-10 w-10 text-primary/40" />
      </div>
    </div>
  );
}
