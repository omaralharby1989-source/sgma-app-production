import { useRef, useState } from "react";
import {
  useGetBoardMembers,
  useCreateBoardMember,
  useUpdateBoardMember,
  useDeleteBoardMember,
  getGetBoardMembersQueryKey,
} from "@workspace/api-client-react";
import type {
  BoardMember,
  CreateBoardMemberInput,
  UpdateBoardMemberInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, Plus, Phone, Mail, Pencil, EyeOff } from "lucide-react";
import { getStoredUser, isAdminOrSuper } from "@/lib/auth";
import { formatBoardBioToBullets } from "@/lib/board";

const BOARD_TYPE = "CURRENT" as const;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] ?? "") + (parts[1][0] ?? "");
}

type FormState = {
  name: string;
  position: string;
  bio: string;
  phone: string;
  email: string;
  imageUrl: string;
  displayOrder: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  position: "",
  bio: "",
  phone: "",
  email: "",
  imageUrl: "",
  displayOrder: "0",
  isActive: true,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BoardCurrent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = getStoredUser();
  const canManage = isAdminOrSuper(user?.role);

  const params = { boardType: BOARD_TYPE };
  const { data: members, isLoading, isError } = useGetBoardMembers(params, {
    query: { queryKey: ["/api/board/members", params], retry: false },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deactivateTarget, setDeactivateTarget] = useState<BoardMember | null>(null);

  const createMember = useCreateBoardMember();
  const updateMember = useUpdateBoardMember();
  const deleteMember = useDeleteBoardMember();
  const saving = createMember.isPending || updateMember.isPending;

  function refetchList() {
    queryClient.invalidateQueries({ queryKey: getGetBoardMembersQueryKey(params) });
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(m: BoardMember) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      position: m.position,
      bio: m.bio,
      phone: m.phone ?? "",
      email: m.email ?? "",
      imageUrl: m.imageUrl ?? "",
      displayOrder: String(m.displayOrder ?? 0),
      isActive: m.isActive,
    });
    setDialogOpen(true);
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "صيغة الصورة غير مدعومة (jpg, png, webp فقط)", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "حجم الصورة كبير جداً، يرجى اختيار صورة أصغر", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, imageUrl: String(reader.result) }));
    };
    reader.onerror = () => {
      toast({ title: "تعذر قراءة الصورة، يرجى المحاولة مرة أخرى", variant: "destructive" });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSave() {
    if (!form.name.trim() || !form.position.trim() || !form.bio.trim()) {
      toast({ title: "الاسم والمنصب والنبذة حقول مطلوبة", variant: "destructive" });
      return;
    }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      toast({ title: "البريد الإلكتروني غير صالح", variant: "destructive" });
      return;
    }

    const orderNum = Number(form.displayOrder);
    const displayOrder = Number.isFinite(orderNum) ? Math.trunc(orderNum) : 0;

    const onError = (err: unknown) => {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر حفظ البيانات";
      toast({ title: msg, variant: "destructive" });
    };

    if (editingId) {
      const payload: UpdateBoardMemberInput = {
        name: form.name.trim(),
        position: form.position.trim(),
        bio: form.bio.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        imageUrl: form.imageUrl || null,
        displayOrder,
        isActive: form.isActive,
      };
      updateMember.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast({ title: "تم تحديث بيانات العضو بنجاح" });
            refetchList();
            setDialogOpen(false);
          },
          onError,
        },
      );
    } else {
      const payload: CreateBoardMemberInput = {
        name: form.name.trim(),
        position: form.position.trim(),
        bio: form.bio.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        imageUrl: form.imageUrl || null,
        boardType: BOARD_TYPE,
        displayOrder,
        isActive: form.isActive,
      };
      createMember.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "تم إضافة عضو مجلس الإدارة بنجاح" });
            refetchList();
            setDialogOpen(false);
          },
          onError,
        },
      );
    }
  }

  function confirmDeactivate() {
    if (!deactivateTarget) return;
    deleteMember.mutate(
      { id: deactivateTarget.id },
      {
        onSuccess: () => {
          toast({ title: "تم إخفاء العضو من الصفحة" });
          refetchList();
          setDeactivateTarget(null);
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر إخفاء العضو";
          toast({ title: msg, variant: "destructive" });
          setDeactivateTarget(null);
        },
      },
    );
  }

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/board" />
      </div>

      <div className="px-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">مجلس الإدارة الحالي</h1>
          <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
            أعضاء مجلس إدارة الجمعية الطبية السورية الألمانية SGMA
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate} className="gap-1 shrink-0">
            <Plus className="h-4 w-4" />
            إضافة عضو
          </Button>
        )}
      </div>

      {isError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">تعذر تحميل بيانات مجلس الإدارة، يرجى المحاولة لاحقاً</span>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !members || members.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          لا توجد بيانات منشورة حالياً لمجلس الإدارة.
        </Card>
      ) : (
        <div className="space-y-4">
          {members.map((m) => (
            <Card key={m.id} className="p-4 shadow-sm border-border/50 space-y-3">
              <div className="flex items-start gap-4">
                {m.imageUrl ? (
                  <img
                    src={m.imageUrl}
                    alt={m.name}
                    className="h-20 w-20 rounded-2xl object-cover shrink-0 border border-border/50"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl shrink-0 bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                    {initials(m.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="font-bold text-lg leading-tight break-words">{m.name}</h3>
                  <p className="text-sm font-medium text-primary mt-0.5">{m.position}</p>
                </div>
              </div>

              {(() => {
                const points = formatBoardBioToBullets(m.bio);
                if (points.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground">لا توجد نبذة متاحة</p>
                  );
                }
                return (
                  <ul className="space-y-1.5">
                    {points.map((point, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed break-words"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="min-w-0">{point}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}

              <div className="flex flex-wrap gap-2">
                {m.phone ? (
                  <a href={`tel:${m.phone}`} className="flex-1 min-w-[120px]">
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <Phone className="h-4 w-4" />
                      اتصال
                    </Button>
                  </a>
                ) : null}
                {m.email ? (
                  <a href={`mailto:${m.email}`} className="flex-1 min-w-[120px]">
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <Mail className="h-4 w-4" />
                      بريد إلكتروني
                    </Button>
                  </a>
                ) : null}
                {!m.phone && !m.email && (
                  <span className="text-xs text-muted-foreground py-2">
                    لا تتوفر معلومات تواصل
                  </span>
                )}
              </div>

              {canManage && (
                <div className="flex gap-2 pt-1 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 mt-2"
                    onClick={() => openEdit(m)}
                  >
                    <Pencil className="h-4 w-4" />
                    تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 mt-2 text-destructive hover:text-destructive"
                    onClick={() => setDeactivateTarget(m)}
                  >
                    <EyeOff className="h-4 w-4" />
                    إخفاء
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل بيانات العضو" : "إضافة عضو جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-2">
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt="معاينة"
                  className="h-24 w-24 rounded-2xl object-cover border border-border/50"
                />
              ) : (
                <div className="h-24 w-24 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                  {initials(form.name || "؟")}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImagePick}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  اختيار صورة
                </Button>
                {form.imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                  >
                    إزالة الصورة
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>الاسم الكامل *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>المنصب *</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>نبذة قصيرة *</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={4}
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                اكتب كل نقطة في سطر مستقل ليتم عرضها بشكل مرتب داخل البطاقة.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>رقم الهاتف</Label>
              <Input
                value={form.phone}
                inputMode="tel"
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input
                value={form.email}
                inputMode="email"
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ترتيب الظهور</Label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <Label className="cursor-pointer">إظهار العضو</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إخفاء العضو؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إخفاء «{deactivateTarget?.name}» من صفحة مجلس الإدارة. يمكن إعادة إظهاره لاحقاً
              من خلال التعديل.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              disabled={deleteMember.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMember.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              إخفاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
