import { Link } from "wouter";
import { useGetAcademyAnnouncements } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/BackButton";
import { Calendar, Clock, User, ChevronLeft } from "lucide-react";
import { specialtyLabel, formatAcademyDate } from "@/lib/academyLabels";
import { LectureThumbnail } from "@/components/LectureThumbnail";

export default function AcademyAnnouncements() {
  const { data: items, isLoading, isError } = useGetAcademyAnnouncements({
    query: { queryKey: ["/api/academy/announcements"] },
  });

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/academy" />
      </div>

      <div className="px-2">
        <h1 className="text-2xl font-bold">إعلانات الأكاديمية</h1>
        <p className="text-muted-foreground text-sm mt-1">
          المحاضرات القادمة والإعلانات الهامة
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card className="p-6 text-center text-sm text-destructive">
          تعذر تحميل الإعلانات. يرجى المحاولة لاحقاً.
        </Card>
      )}

      {!isLoading && !isError && (!items || items.length === 0) && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          لا توجد إعلانات حالياً.
        </Card>
      )}

      {!isLoading && !isError && items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={`/academy/lectures/${item.id}`} className="block">
              <Card className="p-4 shadow-sm border-border/50 hover:bg-muted/40 transition-colors">
                <div className="flex items-start gap-4">
                  <LectureThumbnail src={item.thumbnailUrl} className="h-16 w-16 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold leading-snug">{item.title}</h3>
                      <Badge variant="secondary" className="text-[10px]">قادمة</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {item.lecturerName}
                      </span>
                      {item.lectureDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatAcademyDate(item.lectureDate)}
                        </span>
                      )}
                      {item.lectureTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {item.lectureTime}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {item.isGeneral ? (
                        <Badge variant="outline" className="text-[10px]">{specialtyLabel("GENERAL")}</Badge>
                      ) : (
                        item.allowedSpecialties.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">{specialtyLabel(s)}</Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground opacity-50 shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
