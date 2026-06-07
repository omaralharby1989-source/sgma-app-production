import { useParams } from "wouter";
import { useGetAcademyLecture, getAcademyFile } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { Calendar, User, Clock, FileText, Download, Video, ExternalLink } from "lucide-react";
import { specialtyLabel, formatAcademyDate } from "@/lib/academyLabels";
import { getStoredUser } from "@/lib/auth";

const WATERMARK_TEXT = "هذه التسجيلات مخصصة للأعضاء المصرح لهم فقط — أكاديمية سوريا الطبية";

export default function AcademyLectureDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();

  // Per-user identity watermark (fullName | membershipNumber | email) — deters
  // re-sharing by stamping the viewer's identity over the playback area.
  const viewer = getStoredUser();
  const watermarkIdentity = [viewer?.fullName, viewer?.membershipNumber, viewer?.email]
    .filter(Boolean)
    .join(" | ");

  const { data: lecture, isLoading, isError } = useGetAcademyLecture(id, {
    query: { queryKey: [`/api/academy/lectures/${id}`], enabled: Number.isInteger(id) },
  });

  const downloadFile = async (fileId: number) => {
    try {
      const file = await getAcademyFile(fileId);
      const a = document.createElement("a");
      a.href = file.fileData;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast({ variant: "destructive", title: "تعذر تحميل الملف" });
    }
  };

  return (
    <div className="p-4 pb-24 space-y-5 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/academy/lectures" />
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )}

      {isError && (
        <Card className="p-8 text-center text-sm text-destructive">
          المحاضرة غير متاحة أو لم تعد متوفرة.
        </Card>
      )}

      {!isLoading && !isError && lecture && (
        <>
          <div className="px-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold leading-snug">{lecture.title}</h1>
              {lecture.isUpcoming && <Badge variant="secondary">قادمة</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {lecture.lecturerName}
              </span>
              {lecture.lectureDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatAcademyDate(lecture.lectureDate)}
                </span>
              )}
              {lecture.lectureTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {lecture.lectureTime}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {lecture.isGeneral ? (
                <Badge variant="outline">{specialtyLabel("GENERAL")}</Badge>
              ) : (
                lecture.allowedSpecialties.map((s) => (
                  <Badge key={s} variant="outline">{specialtyLabel(s)}</Badge>
                ))
              )}
            </div>
          </div>

          {/* Recording / live */}
          {lecture.recordingEmbedUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-border bg-black">
              <div className="relative aspect-video w-full">
                <iframe
                  src={lecture.recordingEmbedUrl}
                  title={lecture.title}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
                {/* Watermark overlay — pointer-events-none so it never blocks the player controls */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-end justify-between p-2">
                  {watermarkIdentity && (
                    <span className="rounded bg-black/40 px-2 py-1 text-[10px] font-semibold text-white/85 max-w-[80%] text-left leading-tight ltr:text-left" dir="ltr">
                      {watermarkIdentity}
                    </span>
                  )}
                  <span className="self-center rounded bg-black/30 px-2 py-1 text-[10px] font-medium text-white/70 max-w-[90%] text-center leading-tight">
                    {WATERMARK_TEXT}
                  </span>
                  {watermarkIdentity && (
                    <span className="self-start rounded bg-black/40 px-2 py-1 text-[10px] font-semibold text-white/85 max-w-[80%] text-left leading-tight" dir="ltr">
                      {watermarkIdentity}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : lecture.liveMeetingUrl ? (
            <Card className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Video className="h-5 w-5" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">محاضرة مباشرة</p>
                  <p className="text-muted-foreground text-xs">انقر للانضمام إلى البث المباشر</p>
                </div>
              </div>
              <Button asChild size="sm">
                <a href={lecture.liveMeetingUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 ml-1" />
                  انضمام
                </a>
              </Button>
            </Card>
          ) : (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              التسجيل غير متاح حالياً
            </Card>
          )}

          {/* Description */}
          <Card className="p-4">
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
              {lecture.description}
            </p>
          </Card>

          {/* Attachments */}
          {lecture.attachments && lecture.attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold px-1">الملفات المرفقة</h3>
              <Card className="overflow-hidden">
                <div className="flex flex-col divide-y divide-border/50">
                  {lecture.attachments.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => downloadFile(file.id)}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-right"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium truncate">{file.fileName}</span>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
