import { useState } from "react";
import { useLocation } from "wouter";
import { useGetActiveAds, getGetActiveAdsQueryKey } from "@workspace/api-client-react";
import type { ActiveAdsResponse } from "@workspace/api-client-react";
import { Megaphone, X, ExternalLink } from "lucide-react";

type PageGate = { settingKey: keyof ActiveAdsResponse; placement: string };

// Resolve the current route to a settings flag + ad placement. Returns null on
// routes where ads must never show (login/register and anything unmapped).
function resolveGate(path: string): PageGate | null {
  if (path === "/login" || path === "/register") return null;
  if (path === "/home") return { settingKey: "showOnHome", placement: "HOME_BOTTOM" };
  if (path === "/more") return { settingKey: "showOnMore", placement: "MORE_BOTTOM" };
  if (path.startsWith("/news")) return { settingKey: "showOnNews", placement: "NEWS_BOTTOM" };
  if (path.startsWith("/articles"))
    return { settingKey: "showOnArticles", placement: "ARTICLES_BOTTOM" };
  if (path.startsWith("/board")) return { settingKey: "showOnBoard", placement: "BOARD_BOTTOM" };
  if (
    path === "/about-sgma" ||
    path === "/privacy-policy" ||
    path === "/terms" ||
    path === "/developer-info"
  ) {
    return { settingKey: "showOnStaticPages", placement: "STATIC_PAGES_BOTTOM" };
  }
  if (path.startsWith("/chat")) return { settingKey: "showOnChat", placement: "GLOBAL_BOTTOM" };
  if (path.startsWith("/admin")) return { settingKey: "showOnAdmin", placement: "GLOBAL_BOTTOM" };
  return null;
}

export function AdBanner() {
  const [location] = useLocation();
  const [dismissed, setDismissed] = useState<number[]>([]);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("sgma_auth_token") : null;
  const gate = resolveGate(location);

  // Only query when authenticated AND the route is ad-eligible.
  const enabled = !!token && !!gate;

  const { data } = useGetActiveAds(
    { placement: gate?.placement },
    {
      query: {
        queryKey: getGetActiveAdsQueryKey({ placement: gate?.placement }),
        retry: false,
        refetchInterval: 60000,
        enabled,
      },
    },
  );

  if (!enabled || !gate || !data) return null;
  if (!data.adsEnabled) return null;
  if (data[gate.settingKey] === false) return null;

  const ads = data.ads.filter((a) => !dismissed.includes(a.id));
  if (ads.length === 0) return null;

  return (
    <div className="px-3 pb-3 pt-1 space-y-2 max-w-lg mx-auto">
      {ads.map((ad) => {
        const body = (
          <div className="flex gap-3">
            {ad.imageUrl ? (
              <img
                src={ad.imageUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover bg-muted"
              />
            ) : (
              <div className="shrink-0 h-10 w-10 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <Megaphone className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight break-words">{ad.title}</p>
              <p className="text-xs text-foreground/75 mt-0.5 leading-relaxed break-words line-clamp-3">
                {ad.content}
              </p>
              {ad.linkUrl && (
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary">
                  <ExternalLink className="h-3 w-3" />
                  عرض التفاصيل
                </span>
              )}
            </div>
          </div>
        );

        return (
          <div
            key={ad.id}
            className="relative rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 shadow-sm"
          >
            <span className="absolute top-2 right-3 text-[10px] font-medium text-amber-600/80">
              إعلان
            </span>
            <button
              type="button"
              onClick={() => setDismissed((prev) => [...prev, ad.id])}
              aria-label="إغلاق الإعلان"
              className="absolute top-2 left-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pt-3">
              {ad.linkUrl ? (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
                  {body}
                </a>
              ) : (
                body
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
