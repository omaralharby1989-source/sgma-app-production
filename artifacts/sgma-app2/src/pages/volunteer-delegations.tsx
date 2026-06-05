import { useState, useRef } from "react";
import {
  useCreateVolunteerDelegation,
  useGetMyVolunteerDelegations,
  getGetMyVolunteerDelegationsQueryKey,
  getMyVolunteerDelegationFile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { PROFESSION_GROUPS } from "@/lib/constants";
import {
  HandHeart,
  Send,
  Loader2,
  Printer,
  FileText,
  Trash2,
  Download,
  Paperclip,
} from "lucide-react";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const SUCCESS_MESSAGE =
  "تم تسجيل طلب عملك التطوعي، سيتم التواصل معك لترتيب الإجراءات. شكراً جزيلاً.";

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  SUBMITTED: {
    label: "تم الإرسال",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  IN_REVIEW: {
    label: "قيد المراجعة",
    color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  },
  ACCEPTED: {
    label: "مقبول",
    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  },
  REJECTED: {
    label: "مرفوض",
    color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  },
  ARCHIVED: {
    label: "مؤرشف",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
  },
};

type LocalFile = { fileName: string; mimeType: string; fileData: string };

const readAsDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VolunteerDelegations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullNameArabic, setFullNameArabic] = useState("");
  const [fullNameGerman, setFullNameGerman] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [travelToSyriaFrom, setTravelToSyriaFrom] = useState("");
  const [travelToSyriaTo, setTravelToSyriaTo] = useState("");
  const [volunteerWorkDateText, setVolunteerWorkDateText] = useState("");
  const [volunteerWorkType, setVolunteerWorkType] = useState("");
  const [professionGroup, setProfessionGroup] = useState("");
  const [specialtyWithCertificate, setSpecialtyWithCertificate] = useState("");
  const [needsSyrianPracticeLicenseHelp, setNeedsSyrianPracticeLicenseHelp] = useState(false);
  const [hasLogisticsEquipment, setHasLogisticsEquipment] = useState(false);
  const [equipmentDetails, setEquipmentDetails] = useState("");
  const [files, setFiles] = useState<LocalFile[]>([]);

  const { data: myRequests, isLoading: myLoading } = useGetMyVolunteerDelegations();

  const createMutation = useCreateVolunteerDelegation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyVolunteerDelegationsQueryKey() });
      },
      onError: (err) => {
        const msg = (err as { data?: { error?: string } })?.data?.error;
        toast({
          variant: "destructive",
          title: "تعذر إرسال الطلب",
          description: msg ?? "يرجى التحقق من البيانات والمحاولة مرة أخرى.",
        });
      },
    },
  });

  const handleFiles = async (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const incoming = Array.from(selected);

    if (files.length + incoming.length > MAX_FILES) {
      toast({
        variant: "destructive",
        title: "عدد الملفات كبير",
        description: `يمكنك رفع ${MAX_FILES} ملفات كحد أقصى.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const next: LocalFile[] = [];
    for (const file of incoming) {
      if (file.type !== "application/pdf") {
        toast({
          variant: "destructive",
          title: "نوع ملف غير مدعوم",
          description: `الملف "${file.name}" ليس بصيغة PDF.`,
        });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast({
          variant: "destructive",
          title: "حجم الملف كبير",
          description: `الملف "${file.name}" يتجاوز 5MB.`,
        });
        continue;
      }
      try {
        const dataUri = await readAsDataUri(file);
        next.push({ fileName: file.name, mimeType: "application/pdf", fileData: dataUri });
      } catch {
        toast({
          variant: "destructive",
          title: "تعذر قراءة الملف",
          description: `الملف "${file.name}" تعذّرت قراءته.`,
        });
      }
    }
    if (next.length) setFiles((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): string | null => {
    if (!fullNameArabic.trim()) return "يرجى إدخال الاسم الكامل بالعربية.";
    if (!fullNameGerman.trim()) return "يرجى إدخال الاسم الكامل بالألمانية/اللاتينية.";
    if (!phone.trim()) return "يرجى إدخال رقم الهاتف.";
    if (!whatsapp.trim()) return "يرجى إدخال رقم الواتساب.";
    if (!email.trim()) return "يرجى إدخال البريد الإلكتروني.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return "صيغة البريد الإلكتروني غير صالحة.";
    if (!travelToSyriaFrom) return "يرجى تحديد تاريخ النزول إلى سوريا (من).";
    if (!travelToSyriaTo) return "يرجى تحديد تاريخ النزول إلى سوريا (إلى).";
    if (travelToSyriaFrom > travelToSyriaTo)
      return "تاريخ النزول (من) يجب أن يكون قبل أو يساوي تاريخ النزول (إلى).";
    if (!volunteerWorkDateText.trim()) return "يرجى إدخال تاريخ العمل التطوعي.";
    if (!volunteerWorkType.trim()) return "يرجى إدخال نوع العمل التطوعي.";
    if (!professionGroup.trim()) return "يرجى اختيار المجموعة المهنية.";
    if (!specialtyWithCertificate.trim()) return "يرجى إدخال التخصص (مع الشهادة).";
    if (hasLogisticsEquipment && !equipmentDetails.trim())
      return "يرجى ذكر تفاصيل المعدات اللوجستية.";
    return null;
  };

  const buildPayload = () => ({
    fullNameArabic: fullNameArabic.trim(),
    fullNameGerman: fullNameGerman.trim(),
    phone: phone.trim(),
    whatsapp: whatsapp.trim(),
    email: email.trim(),
    travelToSyriaFrom,
    travelToSyriaTo,
    volunteerWorkDateText: volunteerWorkDateText.trim(),
    volunteerWorkType: volunteerWorkType.trim(),
    professionGroup: professionGroup.trim(),
    specialtyWithCertificate: specialtyWithCertificate.trim(),
    needsSyrianPracticeLicenseHelp,
    hasLogisticsEquipment,
    ...(hasLogisticsEquipment ? { equipmentDetails: equipmentDetails.trim() } : {}),
    ...(files.length ? { attachments: files } : {}),
  });

  const resetForm = () => {
    setFullNameArabic("");
    setFullNameGerman("");
    setPhone("");
    setWhatsapp("");
    setEmail("");
    setTravelToSyriaFrom("");
    setTravelToSyriaTo("");
    setVolunteerWorkDateText("");
    setVolunteerWorkType("");
    setProfessionGroup("");
    setSpecialtyWithCertificate("");
    setNeedsSyrianPracticeLicenseHelp(false);
    setHasLogisticsEquipment(false);
    setEquipmentDetails("");
    setFiles([]);
  };

  const submit = () => {
    const error = validate();
    if (error) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: error });
      return;
    }
    createMutation.mutate(
      { data: buildPayload() },
      {
        onSuccess: () => {
          toast({ title: "تم الإرسال بنجاح", description: SUCCESS_MESSAGE });
          resetForm();
        },
      },
    );
  };

  const printForm = () => {
    const rows: [string, string][] = [
      ["الاسم الكامل (بالعربية)", fullNameArabic],
      ["الاسم الكامل (بالألمانية/اللاتينية)", fullNameGerman],
      ["رقم الهاتف", phone],
      ["رقم الواتساب", whatsapp],
      ["البريد الإلكتروني", email],
      ["تاريخ النزول إلى سوريا (من)", travelToSyriaFrom],
      ["تاريخ النزول إلى سوريا (إلى)", travelToSyriaTo],
      ["تاريخ العمل التطوعي", volunteerWorkDateText],
      ["نوع العمل التطوعي", volunteerWorkType],
      ["المجموعة المهنية", professionGroup],
      ["التخصص (مع شهادة)", specialtyWithCertificate],
      [
        "بحاجة لمساعدة في ترخيص مزاولة المهنة السورية",
        needsSyrianPracticeLicenseHelp ? "نعم" : "لا",
      ],
      ["توجد معدات لوجستية", hasLogisticsEquipment ? "نعم" : "لا"],
      ...(hasLogisticsEquipment ? ([["تفاصيل المعدات", equipmentDetails]] as [string, string][]) : []),
      ["الملفات المرفقة", files.length ? files.map((f) => f.fileName).join("، ") : "لا يوجد"],
    ];

    const today = new Date().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>استمارة تسجيل للوفود التطوعية</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 32px; color: #1a1a1a; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .date { color: #666; margin-bottom: 24px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  td { border: 1px solid #ccc; padding: 10px 12px; font-size: 14px; vertical-align: top; }
  td.k { background: #f4f4f5; font-weight: 600; width: 38%; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>استمارة تسجيل للوفود التطوعية</h1>
<div class="date">تاريخ الطباعة: ${esc(today)}</div>
<table><tbody>
${rows
  .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v || "—")}</td></tr>`)
  .join("")}
</tbody></table>
<script>window.onload = function(){ window.print(); };</script>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) {
      toast({
        variant: "destructive",
        title: "تعذر فتح نافذة الطباعة",
        description: "يرجى السماح بالنوافذ المنبثقة ثم المحاولة مرة أخرى.",
      });
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  const downloadFile = async (fileId: number) => {
    try {
      const file = await getMyVolunteerDelegationFile(fileId);
      const a = document.createElement("a");
      a.href = file.fileData;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast({
        variant: "destructive",
        title: "تعذر تحميل الملف",
        description: "يرجى المحاولة مرة أخرى.",
      });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-muted/20 p-4 pb-24 max-w-lg mx-auto">
      <div className="flex items-center justify-between pt-2 pb-4">
        <h1 className="text-2xl font-bold">تسجيل للوفود التطوعية</h1>
        <BackButton fallback="/more" />
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-primary" />
            استمارة تسجيل العمل التطوعي
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="vd-name-ar">الاسم الكامل (بالعربية)</Label>
              <Input
                id="vd-name-ar"
                value={fullNameArabic}
                onChange={(e) => setFullNameArabic(e.target.value)}
                maxLength={150}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vd-name-de">الاسم الكامل (بالألمانية/اللاتينية)</Label>
              <Input
                id="vd-name-de"
                value={fullNameGerman}
                onChange={(e) => setFullNameGerman(e.target.value)}
                maxLength={150}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vd-phone">رقم الهاتف</Label>
                <Input
                  id="vd-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="text-left"
                  maxLength={40}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vd-wa">رقم الواتساب</Label>
                <Input
                  id="vd-wa"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  dir="ltr"
                  className="text-left"
                  maxLength={40}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vd-email">البريد الإلكتروني</Label>
              <Input
                id="vd-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="text-left"
                maxLength={150}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vd-from">تاريخ النزول إلى سوريا (من)</Label>
                <Input
                  id="vd-from"
                  type="date"
                  value={travelToSyriaFrom}
                  onChange={(e) => setTravelToSyriaFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vd-to">تاريخ النزول إلى سوريا (إلى)</Label>
                <Input
                  id="vd-to"
                  type="date"
                  value={travelToSyriaTo}
                  onChange={(e) => setTravelToSyriaTo(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vd-workdate">تاريخ العمل التطوعي</Label>
              <Input
                id="vd-workdate"
                value={volunteerWorkDateText}
                onChange={(e) => setVolunteerWorkDateText(e.target.value)}
                placeholder="مثال: من 1 إلى 15 آب، أو حسب التنسيق"
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vd-worktype">نوع العمل التطوعي</Label>
              <Input
                id="vd-worktype"
                value={volunteerWorkType}
                onChange={(e) => setVolunteerWorkType(e.target.value)}
                placeholder="مثال: عمليات جراحية، تدريب، استشارات"
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label>المجموعة المهنية</Label>
              <Select value={professionGroup} onValueChange={setProfessionGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المجموعة المهنية" />
                </SelectTrigger>
                <SelectContent>
                  {PROFESSION_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vd-specialty">التخصص (مع شهادة)</Label>
              <Input
                id="vd-specialty"
                value={specialtyWithCertificate}
                onChange={(e) => setSpecialtyWithCertificate(e.target.value)}
                placeholder="مثال: تخدير، جراحة عامة"
                maxLength={200}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="vd-license" className="cursor-pointer pe-3">
                بحاجة لمساعدة في ترخيص مزاولة المهنة السورية؟
              </Label>
              <Switch
                id="vd-license"
                checked={needsSyrianPracticeLicenseHelp}
                onCheckedChange={setNeedsSyrianPracticeLicenseHelp}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="vd-equip" className="cursor-pointer pe-3">
                هل لديك معدات لوجستية للمساهمة بها؟
              </Label>
              <Switch
                id="vd-equip"
                checked={hasLogisticsEquipment}
                onCheckedChange={setHasLogisticsEquipment}
              />
            </div>

            {hasLogisticsEquipment && (
              <div className="space-y-1.5">
                <Label htmlFor="vd-equip-details">تفاصيل المعدات اللوجستية</Label>
                <Textarea
                  id="vd-equip-details"
                  value={equipmentDetails}
                  onChange={(e) => setEquipmentDetails(e.target.value)}
                  placeholder="اذكر نوع المعدات والكمية..."
                  rows={3}
                  maxLength={1000}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>المرفقات (ملفات PDF — حتى 5 ملفات، 5MB لكل ملف)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= MAX_FILES}
              >
                <Paperclip className="h-4 w-4" />
                إضافة ملف PDF
              </Button>
              {files.length > 0 && (
                <ul className="space-y-2">
                  {files.map((f, i) => (
                    <li
                      key={`${f.fileName}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-md border bg-background p-2"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate text-sm">{f.fileName}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => removeFile(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button type="submit" className="w-full gap-2" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                إرسال الطلب
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={printForm}
              >
                <Printer className="h-4 w-4" />
                حفظ كـ PDF / طباعة
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-lg font-bold mb-3">طلباتي</h2>
        {myLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !myRequests || myRequests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              لم تقم بتسجيل أي طلب تطوعي بعد.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myRequests.map((r) => {
              const info = STATUS_INFO[r.status] ?? STATUS_INFO.SUBMITTED;
              return (
                <Card key={r.id} className="shadow-sm border-border/50">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{r.volunteerWorkType}</span>
                      <Badge variant="outline" className={info.color}>
                        {info.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      المجموعة المهنية: {r.professionGroup}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      تاريخ النزول: {r.travelToSyriaFrom} ← {r.travelToSyriaTo}
                    </p>
                    {r.adminNotes && (
                      <p className="text-sm rounded-md bg-muted/50 p-2">
                        <span className="font-medium">ملاحظات الإدارة: </span>
                        {r.adminNotes}
                      </p>
                    )}
                    {r.attachments.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {r.attachments.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => downloadFile(a.id)}
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {a.fileName}
                            <span className="text-muted-foreground">
                              ({formatBytes(a.fileSize)})
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
