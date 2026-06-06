import { useEffect, useState } from "react";
import {
  useGetAdminAdSettings,
  useUpdateAdminAdSettings,
  useGetAdminCustomAds,
  useCreateAdminCustomAd,
  useUpdateAdminCustomAd,
  useDeleteAdminCustomAd,
  getGetAdminAdSettingsQueryKey,
  getGetAdminCustomAdsQueryKey,
} from "@workspace/api-client-react";
import type {
  AdSettings,
  UpdateAdSettingsInput,
  CustomAd,
  CreateCustomAdInput,
  UpdateCustomAdInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImageInput } from "@/components/ImageInput";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, Plus, Megaphone, Info } from "lucide-react";

const PLACEMENTS: { value: string; label: string }[] = [
  { value: "GLOBAL_BOTTOM", label: "كل الصفحات (أسفل)" },
  { value: "HOME_BOTTOM", label: "الصفحة الرئيسية" },
  { value: "NEWS_BOTTOM", label: "الأخبار" },
  { value: "ARTICLES_BOTTOM", label: "المقالات" },
  { value: "BOARD_BOTTOM", label: "مجلس الإدارة" },
  { value: "MORE_BOTTOM", label: "المزيد" },
  { value: "STATIC_PAGES_BOTTOM", label: "الصفحات التعريفية" },
];

const PAGE_TOGGLES: { key: keyof UpdateAdSettingsInput; label: string }[] = [
  { key: "showOnHome", label: "الصفحة الرئيسية" },
  { key: "showOnNews", label: "الأخبار" },
  { key: "showOnArticles", label: "المقالات" },
  { key: "showOnBoard", label: "مجلس الإدارة" },
  { key: "showOnMore", label: "المزيد" },
  { key: "showOnStaticPages", label: "الصفحات التعريفية" },
  { key: "showOnChat", label: "المحادثات" },
  { key: "showOnAdmin", label: "لوحة الإدارة" },
];

function placementLabel(value: string): string {
  return PLACEMENTS.find((p) => p.value === value)?.label ?? value;
}

type AdForm = {
  title: string;
  content: string;
  imageUrl: string;
  linkUrl: string;
  placement: string;
  priority: string;
  isActive: boolean;
  startAt: string;
  endAt: string;
};

const EMPTY_AD: AdForm = {
  title: "",
  content: "",
  imageUrl: "",
  linkUrl: "",
  placement: "GLOBAL_BOTTOM",
  priority: "0",
  isActive: true,
  startAt: "",
  endAt: "",
};

function readError(err: unknown, fallback: string): string {
  return (err as { data?: { error?: string } })?.data?.error ?? fallback;
}

export default function AdminAds() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading: settingsLoading,
    isError: settingsError,
  } = useGetAdminAdSettings({
    query: { queryKey: getGetAdminAdSettingsQueryKey(), retry: false },
  });

  const {
    data: ads,
    isLoading: adsLoading,
    isError: adsError,
  } = useGetAdminCustomAds({
    query: { queryKey: getGetAdminCustomAdsQueryKey(), retry: false },
  });

  const updateSettings = useUpdateAdminAdSettings();
  const createAd = useCreateAdminCustomAd();
  const updateAd = useUpdateAdminCustomAd();
  const deleteAd = useDeleteAdminCustomAd();

  const [local, setLocal] = useState<AdSettings | null>(null);
  useEffect(() => {
    if (settings) setLocal(settings);
  }, [settings]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AdForm>(EMPTY_AD);
  const [deleting, setDeleting] = useState<CustomAd | null>(null);

  const savingAd = createAd.isPending || updateAd.isPending;

  function patchSettings(patch: UpdateAdSettingsInput) {
    if (!local) return;
    const optimistic = { ...local, ...patch } as AdSettings;
    setLocal(optimistic);
    updateSettings.mutate(
      { data: patch },
      {
        onSuccess: (updated) => {
          setLocal(updated);
          queryClient.invalidateQueries({ queryKey: getGetAdminAdSettingsQueryKey() });
        },
        onError: (err) => {
          setLocal(settings ?? null);
          toast({ title: readError(err, "تعذر حفظ الإعدادات"), variant: "destructive" });
        },
      },
    );
  }

  function saveGoogleFields() {
    if (!local) return;
    patchSettings({
      googlePublisherId: local.googlePublisherId ?? null,
      googleAdSlotBottom: local.googleAdSlotBottom ?? null,
    });
    toast({ title: "تم حفظ إعدادات Google" });
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_AD);
    setDialogOpen(true);
  }

  function openEdit(ad: CustomAd) {
    setEditingId(ad.id);
    setForm({
      title: ad.title,
      content: ad.content,
      imageUrl: ad.imageUrl ?? "",
      linkUrl: ad.linkUrl ?? "",
      placement: ad.placement,
      priority: String(ad.priority ?? 0),
      isActive: ad.isActive,
      startAt: ad.startAt ? ad.startAt.slice(0, 10) : "",
      endAt: ad.endAt ? ad.endAt.slice(0, 10) : "",
    });
    setDialogOpen(true);
  }

  function refetchAds() {
    queryClient.invalidateQueries({ queryKey: getGetAdminCustomAdsQueryKey() });
  }

  function handleSaveAd() {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "العنوان والنص مطلوبان", variant: "destructive" });
      return;
    }
    const priority = Number(form.priority);
    if (!Number.isFinite(priority)) {
      toast({ title: "الأولوية يجب أن تكون رقماً", variant: "destructive" });
      return;
    }

    const onError = (err: unknown) =>
      toast({ title: readError(err, "تعذر حفظ الإعلان"), variant: "destructive" });

    if (editingId) {
      const payload: UpdateCustomAdInput = {
        title: form.title.trim(),
        content: form.content.trim(),
        imageUrl: form.imageUrl.trim() === "" ? null : form.imageUrl.trim(),
        linkUrl: form.linkUrl.trim() === "" ? null : form.linkUrl.trim(),
        placement: form.placement,
        priority,
        isActive: form.isActive,
        startAt: form.startAt === "" ? null : form.startAt,
        endAt: form.endAt === "" ? null : form.endAt,
      };
      updateAd.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast({ title: "تم تحديث الإعلان" });
            refetchAds();
            setDialogOpen(false);
          },
          onError,
        },
      );
    } else {
      const payload: CreateCustomAdInput = {
        title: form.title.trim(),
        content: form.content.trim(),
        imageUrl: form.imageUrl.trim() === "" ? null : form.imageUrl.trim(),
        linkUrl: form.linkUrl.trim() === "" ? null : form.linkUrl.trim(),
        placement: form.placement,
        priority,
        isActive: form.isActive,
        ...(form.startAt ? { startAt: form.startAt } : {}),
        ...(form.endAt ? { endAt: form.endAt } : {}),
      };
      createAd.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "تم إنشاء الإعلان" });
            refetchAds();
            setDialogOpen(false);
          },
          onError,
        },
      );
    }
  }

  function toggleAdActive(ad: CustomAd) {
    updateAd.mutate(
      { id: ad.id, data: { isActive: !ad.isActive } },
      {
        onSuccess: () => {
          toast({ title: ad.isActive ? "تم إيقاف الإعلان" : "تم تفعيل الإعلان" });
          refetchAds();
        },
        onError: (err) =>
          toast({ title: readError(err, "تعذر تعديل الإعلان"), variant: "destructive" }),
      },
    );
  }

  function handleDelete() {
    if (!deleting) return;
    deleteAd.mutate(
      { id: deleting.id },
      {
        onSuccess: () => {
          toast({ title: "تم إيقاف الإعلان" });
          refetchAds();
          setDeleting(null);
        },
        onError: (err) =>
          toast({ title: readError(err, "تعذر حذف الإعلان"), variant: "destructive" }),
      },
    );
  }

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/admin" />
      </div>
      <div className="px-2">
        <h1 className="text-2xl font-bold">إدارة الإعلانات</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إعدادات الإعلانات والإعلانات الداخلية المخصصة (للمدير العام فقط)
        </p>
      </div>

      {/* Settings */}
      {settingsError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">تعذر تحميل إعدادات الإعلانات</span>
        </Card>
      ) : settingsLoading || !local ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <>
          <Card className="p-4 space-y-4 shadow-sm border-border/50">
            <h2 className="font-semibold">الإعدادات العامة</h2>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-sm">تفعيل الإعلانات</div>
                <p className="text-xs text-muted-foreground">المفتاح الرئيسي لعرض كل الإعلانات</p>
              </div>
              <Switch
                checked={local.adsEnabled}
                onCheckedChange={(v) => patchSettings({ adsEnabled: v })}
                disabled={updateSettings.isPending}
              />
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="text-sm font-medium">الصفحات التي تظهر فيها الإعلانات</div>
              {PAGE_TOGGLES.map((t) => (
                <div key={t.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{t.label}</span>
                  <Switch
                    checked={local[t.key as keyof AdSettings] as boolean}
                    onCheckedChange={(v) => patchSettings({ [t.key]: v } as UpdateAdSettingsInput)}
                    disabled={updateSettings.isPending || !local.adsEnabled}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Google AdSense placeholder */}
          <Card className="p-4 space-y-3 shadow-sm border-border/50">
            <h2 className="font-semibold flex items-center gap-2">
              إعداد Google AdSense
              <Badge variant="outline" className="text-[10px]">تحضيري</Badge>
            </h2>
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-amber-700">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                لن يتم ربط Google AdSense فعلياً الآن. هذه الحقول للتحضير فقط — لن يتم تحميل أي سكربت
                إعلانات أو عرض إعلانات Google حتى يتم إكمال الربط لاحقاً.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">تفعيل إعلانات Google (تحضيري)</span>
              <Switch
                checked={local.googleAdsEnabled}
                onCheckedChange={(v) => patchSettings({ googleAdsEnabled: v })}
                disabled={updateSettings.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>معرّف الناشر (Publisher ID)</Label>
              <Input
                value={local.googlePublisherId ?? ""}
                onChange={(e) =>
                  setLocal((s) => (s ? { ...s, googlePublisherId: e.target.value } : s))
                }
                placeholder="ca-pub-..."
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>معرّف الوحدة الإعلانية (Ad Slot)</Label>
              <Input
                value={local.googleAdSlotBottom ?? ""}
                onChange={(e) =>
                  setLocal((s) => (s ? { ...s, googleAdSlotBottom: e.target.value } : s))
                }
                placeholder="0000000000"
                dir="ltr"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={saveGoogleFields}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ إعدادات Google
            </Button>
          </Card>
        </>
      )}

      {/* Custom ads */}
      <div className="px-2 flex items-end justify-between gap-2 pt-1">
        <h2 className="text-lg font-bold">الإعلانات المخصصة</h2>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          إعلان جديد
        </Button>
      </div>

      {adsError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">تعذر تحميل الإعلانات</span>
        </Card>
      ) : adsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : !ads || ads.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">لا توجد إعلانات مخصصة</Card>
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => (
            <Card key={ad.id} className="p-4 shadow-sm border-border/50 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  {ad.imageUrl ? (
                    <img
                      src={ad.imageUrl}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover bg-muted shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Megaphone className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{ad.title}</div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{ad.content}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {placementLabel(ad.placement)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">الأولوية: {ad.priority}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={ad.isActive ? "default" : "outline"}>
                  {ad.isActive ? "نشط" : "متوقف"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={ad.isActive}
                    onCheckedChange={() => toggleAdActive(ad)}
                    disabled={updateAd.isPending}
                  />
                  <span className="text-xs text-muted-foreground">
                    {ad.isActive ? "مفعّل" : "معطّل"}
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(ad)}>
                  تحرير
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleting(ad)}
                >
                  حذف
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تحرير الإعلان" : "إعلان جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>عنوان الإعلان *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>نص الإعلان *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={3}
              />
            </div>
            <ImageInput
              value={form.imageUrl}
              onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))}
              label="صورة الإعلان (اختياري)"
            />
            <div className="space-y-1.5">
              <Label>رابط الإعلان (اختياري)</Label>
              <Input
                value={form.linkUrl}
                onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                placeholder="https://..."
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>مكان الظهور</Label>
              <Select
                value={form.placement}
                onValueChange={(v) => setForm((f) => ({ ...f, placement: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLACEMENTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>الأولوية</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <span className="text-sm text-muted-foreground">نشط</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>تاريخ البداية</Label>
                <Input
                  type="date"
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ النهاية</Label>
                <Input
                  type="date"
                  value={form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={savingAd}>
              إلغاء
            </Button>
            <Button onClick={handleSaveAd} disabled={savingAd}>
              {savingAd && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إيقاف الإعلان</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إيقاف عرض هذا الإعلان. هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleteAd.isPending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteAd.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAd.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
