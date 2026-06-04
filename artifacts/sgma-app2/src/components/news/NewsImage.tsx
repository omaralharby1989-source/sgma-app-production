import { useState } from "react";
import { Newspaper } from "lucide-react";

export function NewsImage({
  src,
  alt,
  className = "",
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;

  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-emerald-500/20">
          <Newspaper className="h-10 w-10 text-primary/40" />
        </div>
      )}
    </div>
  );
}
