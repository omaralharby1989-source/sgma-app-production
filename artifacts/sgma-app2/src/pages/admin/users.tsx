import { useState } from "react";
import {
  useGetAdminUsers,
  useUpdateAdminUser,
  getGetAdminUsersQueryKey,
  getAdminUser,
} from "@workspace/api-client-react";
import type {
  AdminUserItem,
  AdminUpdateUserInput,
  GetAdminUsersRole,
  GetAdminUsersStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ACADEMY_SPECIALTY_LABELS,
  ACADEMY_SPECIALTY_OPTIONS,
  specialtyLabel,
} from "@/lib/academyLabels";
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
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { getStoredUser } from "@/lib/auth";
import { AlertCircle, Search, Loader2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  MEMBER: "عضو",
  MODERATOR: "مشرف",
  ADMIN: "مدير",
  SUPER_ADMIN: "مدير عام",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد المراجعة",
  ACTIVE: "نشط",
  SUSPENDED: "موقوف",
};

const ACCESS_SCOPE_LABELS: Record<string, string> = {
  FULL_APP: "التطبيق الكامل",
  SYRIA_ACADEMY_ONLY: "أكاديمية سوريا فقط",
};

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "ACTIVE") return "default";
  if (status === "SUSPENDED") return "destructive";
  return "secondary";
}

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const me = getStoredUser();
  const myRole = me?.role;
  const isSuper = myRole === "SUPER_ADMIN";

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [editing, setEditing] = useState<AdminUserItem | null>(null);
  const [form, setForm] = useState<{
    role: string;
    status: string;
    isActive: boolean;
    membershipNumber: string;
    accessScope: string;
    academySpecialty: string;
    academyAllowedSpecialties: string[];
  }>({
    role: "MEMBER",
    status: "ACTIVE",
    isActive: true,
    membershipNumber: "",
    accessScope: "FULL_APP",
    academySpecialty: "",
    academyAllowedSpecialties: [],
  });

  const params = {
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(roleFilter !== "ALL" ? { role: roleFilter as GetAdminUsersRole } : {}),
    ...(statusFilter !== "ALL" ? { status: statusFilter as GetAdminUsersStatus } : {}),
  };

  const { data: users, isLoading, isError } = useGetAdminUsers(params, {
    query: { queryKey: ["/api/admin/users", params], retry: false },
  });

  const updateUser = useUpdateAdminUser();

  // Roles this admin may assign. SUPER_ADMIN can assign anything except creating
  // another SUPER_ADMIN here (kept simple: super can set any). ADMIN cannot
  // assign ADMIN or SUPER_ADMIN. Backend enforces regardless.
  const assignableRoles = isSuper
    ? ["MEMBER", "MODERATOR", "ADMIN", "SUPER_ADMIN"]
    : ["MEMBER", "MODERATOR"];

  const [allowedTouched, setAllowedTouched] = useState(false);

  async function openEdit(u: AdminUserItem) {
    setEditing(u);
    setAllowedTouched(false);
    setForm({
      role: u.role,
      status: u.status,
      isActive: u.isActive,
      membershipNumber: u.membershipNumber ?? "",
      accessScope: u.accessScope ?? "FULL_APP",
      academySpecialty: u.academySpecialty ?? "",
      academyAllowedSpecialties: [],
    });
    // Preload authoritative academy specialties from the detail endpoint so
    // editing the checklist never overwrites previously-stored values.
    try {
      const detail = await getAdminUser(u.id);
      setForm((f) => ({
        ...f,
        academySpecialty: detail.academySpecialty ?? "",
        academyAllowedSpecialties: detail.academyAllowedSpecialties ?? [],
      }));
    } catch {
      /* keep list-derived defaults if detail fetch fails */
    }
  }

  function toggleAllowedSpecialty(s: string) {
    setAllowedTouched(true);
    setForm((f) => ({
      ...f,
      academyAllowedSpecialties: f.academyAllowedSpecialties.includes(s)
        ? f.academyAllowedSpecialties.filter((x) => x !== s)
        : [...f.academyAllowedSpecialties, s],
    }));
  }

  // ADMIN cannot act on SUPER_ADMIN users at all
  function canEdit(u: AdminUserItem): boolean {
    if (u.id === me?.id) return true;
    if (!isSuper && u.role === "SUPER_ADMIN") return false;
    return true;
  }

  function handleActivate(u: AdminUserItem) {
    updateUser.mutate(
      { id: u.id, data: { status: "ACTIVE", isActive: true } },
      {
        onSuccess: () => {
          toast({ title: "تم تفعيل الحساب بنجاح" });
          queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey(params) });
        },
        onError: (err) => {
          const msg =
            (err as { data?: { error?: string } })?.data?.error ?? "تعذر تفعيل الحساب";
          toast({ title: msg, variant: "destructive" });
        },
      },
    );
  }

  function handleSave() {
    if (!editing) return;
    const isSyria = form.accessScope === "SYRIA_ACADEMY_ONLY";
    const payload: AdminUpdateUserInput = {
      role: form.role as AdminUpdateUserInput["role"],
      status: form.status as AdminUpdateUserInput["status"],
      isActive: form.isActive,
      membershipNumber: form.membershipNumber.trim() || null,
      accessScope: form.accessScope as AdminUpdateUserInput["accessScope"],
      academySpecialty: isSyria ? form.academySpecialty.trim() || null : null,
      ...(allowedTouched
        ? { academyAllowedSpecialties: isSyria ? form.academyAllowedSpecialties : [] }
        : {}),
    };
    updateUser.mutate(
      { id: editing.id, data: payload },
      {
        onSuccess: () => {
          toast({ title: "تم تحديث العضو بنجاح" });
          queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey(params) });
          setEditing(null);
        },
        onError: (err) => {
          const msg =
            (err as { data?: { error?: string } })?.data?.error ?? "تعذر تحديث العضو";
          toast({ title: msg, variant: "destructive" });
        },
      },
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/admin" />
      </div>
      <div className="px-2">
        <h1 className="text-2xl font-bold">إدارة الأعضاء</h1>
        <p className="text-muted-foreground text-sm mt-1">عرض وتعديل أدوار وحالات الأعضاء</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم أو الحساب أو البريد"
            className="pr-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الأدوار</SelectItem>
            <SelectItem value="MEMBER">عضو</SelectItem>
            <SelectItem value="MODERATOR">مشرف</SelectItem>
            <SelectItem value="ADMIN">مدير</SelectItem>
            <SelectItem value="SUPER_ADMIN">مدير عام</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الحالات</SelectItem>
            <SelectItem value="PENDING">قيد المراجعة</SelectItem>
            <SelectItem value="ACTIVE">نشط</SelectItem>
            <SelectItem value="SUSPENDED">موقوف</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">تعذر تحميل الأعضاء، يرجى المحاولة لاحقاً</span>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !users || users.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">لا يوجد أعضاء مطابقون</Card>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="p-4 shadow-sm border-border/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{u.fullName}</div>
                  <div className="text-xs text-muted-foreground truncate">@{u.account}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  <div className="text-xs text-muted-foreground truncate" dir="ltr">
                    رقم العضوية: {u.membershipNumber || "غير مضاف"}
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    <Badge variant={statusBadgeVariant(u.status)}>
                      {STATUS_LABELS[u.status] ?? u.status}
                    </Badge>
                    {!u.isActive && <Badge variant="destructive">معطل</Badge>}
                    {u.accessScope === "SYRIA_ACADEMY_ONLY" && (
                      <Badge variant="outline" className="border-primary text-primary">
                        أكاديمية سوريا
                        {u.academySpecialty ? ` · ${specialtyLabel(u.academySpecialty)}` : ""}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {(u.status === "PENDING" || !u.isActive) && (
                    <Button
                      size="sm"
                      disabled={!canEdit(u) || updateUser.isPending}
                      onClick={() => handleActivate(u)}
                    >
                      تفعيل الحساب
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canEdit(u)}
                    onClick={() => openEdit(u)}
                  >
                    تعديل
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل العضو</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <div className="font-semibold">{editing.fullName}</div>
                <div className="text-xs text-muted-foreground">@{editing.account}</div>
              </div>

              <div className="space-y-2">
                <Label>الدور</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Always show the current role so it isn't lost from view */}
                    {Array.from(new Set([editing.role, ...assignableRoles])).map((r) => (
                      <SelectItem key={r} value={r} disabled={!assignableRoles.includes(r)}>
                        {ROLE_LABELS[r] ?? r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">قيد الانتظار</SelectItem>
                    <SelectItem value="ACTIVE">نشط</SelectItem>
                    <SelectItem value="SUSPENDED">موقوف</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>رقم العضوية</Label>
                <Input
                  value={form.membershipNumber}
                  onChange={(e) => setForm((f) => ({ ...f, membershipNumber: e.target.value }))}
                  dir="ltr"
                  className="text-left"
                  placeholder="غير مضاف"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>الحساب مفعّل</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
              </div>

              <div className="space-y-2">
                <Label>نطاق الوصول</Label>
                <Select
                  value={form.accessScope}
                  onValueChange={(v) => setForm((f) => ({ ...f, accessScope: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCESS_SCOPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.accessScope === "SYRIA_ACADEMY_ONLY" && (
                <>
                  <div className="space-y-2">
                    <Label>الاختصاص</Label>
                    <Select
                      value={form.academySpecialty || "GENERAL"}
                      onValueChange={(v) => setForm((f) => ({ ...f, academySpecialty: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACADEMY_SPECIALTY_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{ACADEMY_SPECIALTY_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>اختصاصات إضافية مسموح بها</Label>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 max-h-44 overflow-y-auto">
                      {ACADEMY_SPECIALTY_OPTIONS.filter((s) => s !== "GENERAL").map((s) => (
                        <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={form.academyAllowedSpecialties.includes(s)}
                            onCheckedChange={() => toggleAllowedSpecialty(s)}
                          />
                          <span>{ACADEMY_SPECIALTY_LABELS[s]}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      اتركها فارغة للاكتفاء باختصاص العضو الأساسي. عند عدم التعديل لن تتغير القيمة الحالية.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={updateUser.isPending}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={updateUser.isPending}>
              {updateUser.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
