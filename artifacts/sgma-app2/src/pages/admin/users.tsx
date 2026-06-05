import { useState } from "react";
import {
  useGetAdminUsers,
  useUpdateAdminUser,
  getGetAdminUsersQueryKey,
} from "@workspace/api-client-react";
import type {
  AdminUserItem,
  AdminUpdateUserInput,
  GetAdminUsersRole,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
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
  PENDING: "قيد الانتظار",
  ACTIVE: "نشط",
  SUSPENDED: "موقوف",
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const me = getStoredUser();
  const myRole = me?.role;
  const isSuper = myRole === "SUPER_ADMIN";

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [editing, setEditing] = useState<AdminUserItem | null>(null);
  const [form, setForm] = useState<{ role: string; status: string; isActive: boolean; membershipNumber: string }>({
    role: "MEMBER",
    status: "ACTIVE",
    isActive: true,
    membershipNumber: "",
  });

  const params = {
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(roleFilter !== "ALL" ? { role: roleFilter as GetAdminUsersRole } : {}),
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

  function openEdit(u: AdminUserItem) {
    setEditing(u);
    setForm({ role: u.role, status: u.status, isActive: u.isActive, membershipNumber: u.membershipNumber ?? "" });
  }

  // ADMIN cannot act on SUPER_ADMIN users at all
  function canEdit(u: AdminUserItem): boolean {
    if (u.id === me?.id) return true;
    if (!isSuper && u.role === "SUPER_ADMIN") return false;
    return true;
  }

  function handleSave() {
    if (!editing) return;
    const payload: AdminUpdateUserInput = {
      role: form.role as AdminUpdateUserInput["role"],
      status: form.status as AdminUpdateUserInput["status"],
      isActive: form.isActive,
      membershipNumber: form.membershipNumber.trim() || null,
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
          <SelectTrigger className="w-32">
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
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    <Badge variant={u.status === "ACTIVE" ? "default" : "outline"}>
                      {STATUS_LABELS[u.status] ?? u.status}
                    </Badge>
                    {!u.isActive && <Badge variant="destructive">معطل</Badge>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canEdit(u)}
                  onClick={() => openEdit(u)}
                >
                  تعديل
                </Button>
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
