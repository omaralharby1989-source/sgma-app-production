import { Link } from "wouter";
import { useGetAcademyLectures } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/BackButton";
import { ChevronLeft, Calendar, User } from "lucide-react";
import { specialtyLabel, formatAcademyDate } from "@/lib/academyLabels";
import { LectureThumbnail } from "@/components/LectureThumbnail";

export default function AcademyLectures() {
  const { data: lectures, isLoading, isError } = useGetAcademyLectures(undefined, {
    query: { queryKey: ["/api/academy/lectures"] },
  });

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/academy" />
      </div>

      <div className="px-2">
        <h1 className="text-2xl font-bold">المحاضرات والتسجيلات</h1>
        <p className="text-muted-foreground text-sm mt-1">
          المحاضرات المتاحة لاختصاصك في أكاديمية سوريا
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card className="p-6 text-center text-sm text-destructive">
          تعذر تحميل المحاضرات. يرجى المحاولة لاحقاً.
        </Card>
      )}

      {!isLoading && !isError && (!lectures || lectures.length === 0) && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          لا توجد محاضرات متاحة حالياً.
        </Card>
      )}

      {!isLoading && !isError && lectures && lectures.length > 0 && (
        <div className="space-y-3">
          {lectures.map((lecture) => (
            <Link key={lecture.id} href={`/academy/lectures/${lecture.id}`} className="block">
              <Card className="p-4 shadow-sm border-border/50 hover:bg-muted/40 transition-colors">
                <div className="flex items-start gap-4">
                  <LectureThumbnail src={lecture.thumbnailUrl} className="h-16 w-16 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold leading-snug">{lecture.title}</h3>
                      {lecture.isUpcoming && (
                        <Badge variant="secondary" className="text-[10px]">قادمة</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {lecture.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {lecture.lecturerName}
                      </span>
                      {lecture.lectureDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatAcademyDate(lecture.lectureDate)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {lecture.isGeneral ? (
                        <Badge variant="outline" className="text-[10px]">
                          {specialtyLabel("GENERAL")}
                        </Badge>
                      ) : (
                        lecture.allowedSpecialties.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">
                            {specialtyLabel(s)}
                          </Badge>
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
