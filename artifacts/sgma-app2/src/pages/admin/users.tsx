import { useState } from "react";
import {
  useGetAdminUsers,
  useUpdateAdminUser,
  getGetAdminUsersQueryKey,
  getAdminUser,
  exportAdminMembers,
} from "@workspace/api-client-react";
import type {
  AdminUserItem,
  AdminUpdateUserInput,
  AdminMemberExportItem,
  ExportAdminMembersParams,
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
  SPECIAL_ALL,
} from "@/lib/academyLabels";
import { PROFESSION_GROUPS } from "@/lib/constants";
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
import {
  AlertCircle,
  Search,
  Loader2,
  FileSpreadsheet,
  Printer,
  CheckSquare,
  X,
} from "lucide-react";

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

type ExportMode = "filters" | "all" | "selected";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });
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

  // ---- Export state ----
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [exportMode, setExportMode] = useState<ExportMode>("filters");
  const [expAccessScope, setExpAccessScope] = useState<string>("ALL");
  const [expProfession, setExpProfession] = useState<string>("ALL");
  const [expSpecialty, setExpSpecialty] = useState<string>("ALL");
  const [includeActivity, setIncludeActivity] = useState(true);
  const [exporting, setExporting] = useState(false);

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

  const assignableRoles = isSuper
    ? ["MEMBER", "MODERATOR", "ADMIN", "SUPER_ADMIN"]
    : ["MEMBER", "MODERATOR"];

  const [allowedTouched, setAllowedTouched] = useState(false);

  // ---- Selection helpers ----
  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      (users ?? []).forEach((u) => next.add(u.id));
      return next;
    });
  }
  function clearSelection() {
    setSelected(new Set());
  }

  function buildExportParams(): ExportAdminMembersParams {
    const p: ExportAdminMembersParams = {
      includeActivity: includeActivity ? "true" : "false",
    };
    if (exportMode === "selected") {
      p.selectedIds = Array.from(selected).join(",");
      return p;
    }
    if (exportMode === "filters") {
      if (q.trim()) p.q = q.trim();
      if (roleFilter !== "ALL") p.role = roleFilter as ExportAdminMembersParams["role"];
      if (statusFilter !== "ALL") p.status = statusFilter as ExportAdminMembersParams["status"];
      if (expAccessScope !== "ALL")
        p.accessScope = expAccessScope as ExportAdminMembersParams["accessScope"];
      if (expProfession !== "ALL") p.professionGroup = expProfession;
      if (expSpecialty !== "ALL") p.academySpecialty = expSpecialty;
    }
    // "all" mode: send nothing besides includeActivity
    return p;
  }

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function activeFiltersSummary(): string {
    if (exportMode === "all") return "كل الأعضاء";
    if (exportMode === "selected") return `الأعضاء المحددون (${selected.size})`;
    const parts: string[] = [];
    if (q.trim()) parts.push(`بحث: ${q.trim()}`);
    if (roleFilter !== "ALL") parts.push(`الدور: ${ROLE_LABELS[roleFilter] ?? roleFilter}`);
    if (statusFilter !== "ALL") parts.push(`الحالة: ${STATUS_LABELS[statusFilter] ?? statusFilter}`);
    if (expAccessScope !== "ALL")
      parts.push(`النطاق: ${ACCESS_SCOPE_LABELS[expAccessScope] ?? expAccessScope}`);
    if (expProfession !== "ALL") parts.push(`المهنة: ${expProfession}`);
    if (expSpecialty !== "ALL") parts.push(`الاختصاص: ${specialtyLabel(expSpecialty)}`);
    return parts.length ? parts.join(" — ") : "كل الأعضاء (بدون فلاتر)";
  }

  async function fetchExportRows(): Promise<AdminMemberExportItem[] | null> {
    if (exportMode === "selected" && selected.size === 0) {
      toast({ variant: "destructive", title: "لم يتم تحديد أي عضو" });
      return null;
    }
    const rows = await exportAdminMembers(buildExportParams());
    if (!rows || rows.length === 0) {
      toast({ title: "لا يوجد أعضاء مطابقون للتصدير" });
      return null;
    }
    return rows;
  }

  async function downloadCsv() {
    setExporting(true);
    try {
      const rows = await fetchExportRows();
      if (!rows) return;
      const headers = [
        "المعرّف",
        "الاسم الكامل",
        "اسم الحساب",
        "البريد الإلكتروني",
        "الدور",
        "الحالة",
        "مفعّل",
        "رقم العضوية",
        "الهاتف",
        "واتساب",
        "تاريخ الميلاد",
        "العنوان",
        "المجموعة المهنية",
        "الاختصاص",
        "نطاق الوصول",
        "اختصاص الأكاديمية",
        "تاريخ الإنشاء",
        ...(includeActivity
          ? [
              "المقالات",
              "مقالات معتمدة",
              "مقالات قيد المراجعة",
              "الأخبار",
              "المهام المكلّف بها",
              "تقارير المهام",
              "طلبات التطوع",
              "رسائل عامة",
              "رسائل الإدارة",
            ]
          : []),
      ];
      const cell = (v: unknown) => {
        let s = v === null || v === undefined ? "" : String(v);
        // Neutralize spreadsheet formula injection: a leading =,+,-,@ (or
        // control char) can be executed by Excel. Prefix with an apostrophe.
        if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
        return `"${s.replace(/"/g, '""')}"`;
      };
      const lines = [headers.map(cell).join(",")];
      for (const r of rows) {
        const a = r.activity;
        lines.push(
          [
            r.id,
            r.fullName,
            r.account,
            r.email,
            ROLE_LABELS[r.role] ?? r.role,
            STATUS_LABELS[r.status] ?? r.status,
            r.isActive ? "نعم" : "لا",
            r.membershipNumber ?? "",
            r.phone ?? "",
            r.whatsapp ?? "",
            r.birthDate ?? "",
            r.address ?? "",
            r.professionGroup ?? "",
            r.specialtyText ?? "",
            ACCESS_SCOPE_LABELS[r.accessScope] ?? r.accessScope,
            r.academySpecialty ? specialtyLabel(r.academySpecialty) : "",
            fmtDate(r.createdAt),
            ...(includeActivity
              ? [
                  a?.articlesTotal ?? 0,
                  a?.articlesApproved ?? 0,
                  a?.articlesPending ?? 0,
                  a?.newsCreated ?? 0,
                  a?.tasksAssigned ?? 0,
                  a?.taskReports ?? 0,
                  a?.volunteerRequests ?? 0,
                  a?.publicMessages ?? 0,
                  a?.adminMessages ?? 0,
                ]
              : []),
          ]
            .map(cell)
            .join(","),
        );
      }
      const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sgma-members-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({ title: "تم تجهيز ملف التصدير بنجاح" });
    } catch {
      toast({ variant: "destructive", title: "تعذر تجهيز ملف التصدير" });
    } finally {
      setExporting(false);
    }
  }

  async function printPdf() {
    setExporting(true);
    try {
      const rows = await fetchExportRows();
      if (!rows) return;
      const today = new Date().toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const actHead = includeActivity
        ? "<th>المقالات</th><th>المهام</th><th>طلبات التطوع</th>"
        : "";
      const body = rows
        .map((r) => {
          const a = r.activity;
          const act = includeActivity
            ? `<td>${a?.articlesTotal ?? 0}</td><td>${a?.tasksAssigned ?? 0}</td><td>${a?.volunteerRequests ?? 0}</td>`
            : "";
          return `<tr>
<td>${esc(String(r.id))}</td>
<td>${esc(r.fullName)}</td>
<td>${esc(r.account)}</td>
<td>${esc(r.email)}</td>
<td>${esc(ROLE_LABELS[r.role] ?? r.role)}</td>
<td>${esc(STATUS_LABELS[r.status] ?? r.status)}</td>
<td>${esc(r.membershipNumber || "—")}</td>
<td>${esc(r.professionGroup || "—")}</td>
${act}
</tr>`;
        })
        .join("");
      const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>تقرير الأعضاء</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 32px; color: #1a1a1a; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #666; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 7px 9px; font-size: 12px; text-align: right; vertical-align: top; }
  th { background: #f4f4f5; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>تقرير الأعضاء — SGMA</h1>
<div class="meta">تاريخ التقرير: ${esc(today)} — العدد: ${rows.length}<br/>نطاق التصدير: ${esc(activeFiltersSummary())}</div>
<table><thead><tr>
<th>المعرّف</th><th>الاسم</th><th>الحساب</th><th>البريد</th><th>الدور</th><th>الحالة</th><th>رقم العضوية</th><th>المهنة</th>${actHead}
</tr></thead><tbody>${body}</tbody></table>
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
      toast({ title: "تم تجهيز ملف التصدير بنجاح" });
    } catch {
      toast({ variant: "destructive", title: "تعذر تجهيز ملف التصدير" });
    } finally {
      setExporting(false);
    }
  }

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
    setForm((f) => {
      const has = f.academyAllowedSpecialties.includes(s);
      if (s === SPECIAL_ALL) {
        return { ...f, academyAllowedSpecialties: has ? [] : [SPECIAL_ALL] };
      }
      const next = has
        ? f.academyAllowedSpecialties.filter((x) => x !== s)
        : [...f.academyAllowedSpecialties.filter((x) => x !== SPECIAL_ALL), s];
      return { ...f, academyAllowedSpecialties: next };
    });
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

  const selectedCount = selected.size;
  const exportDisabled = exporting || (exportMode === "selected" && selectedCount === 0);

  return (
    <div className="p-4 pb-24 space-y-4 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
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

      {/* ---- Export card ---- */}
      <Card className="p-4 space-y-3 border-primary/20 bg-primary/[0.03]">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">تصدير بيانات الأعضاء</h2>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">نطاق التصدير</Label>
          <Select value={exportMode} onValueChange={(v) => setExportMode(v as ExportMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="filters">حسب الفلاتر الحالية</SelectItem>
              <SelectItem value="all">كل الأعضاء</SelectItem>
              <SelectItem value="selected">الأعضاء المحددون فقط</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {exportMode === "filters" && (
          <div className="grid grid-cols-1 gap-2">
            <Select value={expAccessScope} onValueChange={setExpAccessScope}>
              <SelectTrigger>
                <SelectValue placeholder="نطاق الوصول" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل نطاقات الوصول</SelectItem>
                {Object.entries(ACCESS_SCOPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={expProfession} onValueChange={setExpProfession}>
              <SelectTrigger>
                <SelectValue placeholder="المجموعة المهنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل المجموعات المهنية</SelectItem>
                {PROFESSION_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={expSpecialty} onValueChange={setExpSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="اختصاص الأكاديمية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل اختصاصات الأكاديمية</SelectItem>
                {ACADEMY_SPECIALTY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ACADEMY_SPECIALTY_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label className="text-xs">تضمين ملخص النشاط</Label>
          <Switch checked={includeActivity} onCheckedChange={setIncludeActivity} />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>عدد الأعضاء المحددين: {selectedCount}</span>
          {selectedCount > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-destructive"
              onClick={clearSelection}
            >
              <X className="h-3.5 w-3.5" />
              إلغاء التحديد
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="gap-2 flex-1"
            onClick={selectAllVisible}
            disabled={!users || users.length === 0}
          >
            <CheckSquare className="h-4 w-4" />
            تحديد كل المعروض
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="gap-2 flex-1" onClick={downloadCsv} disabled={exportDisabled}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            تصدير Excel (CSV)
          </Button>
          <Button
            variant="outline"
            className="gap-2 flex-1"
            onClick={printPdf}
            disabled={exportDisabled}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            تصدير PDF
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          ملف Excel يُصدَّر بصيغة CSV متوافقة مع Excel (ترميز UTF-8). لا يتم تصدير كلمات المرور أو أي بيانات سرية.
        </p>
      </Card>

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
              <div className="flex items-start gap-3">
                <Checkbox
                  className="mt-1 shrink-0"
                  checked={selected.has(u.id)}
                  onCheckedChange={() => toggleSelect(u.id)}
                  aria-label="تحديد العضو للتصدير"
                />
                <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
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
                    <div className="rounded-lg border border-border p-3 max-h-52 overflow-y-auto space-y-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer font-medium border-b border-border pb-2">
                        <Checkbox
                          checked={form.academyAllowedSpecialties.includes(SPECIAL_ALL)}
                          onCheckedChange={() => toggleAllowedSpecialty(SPECIAL_ALL)}
                        />
                        <span>كل الاختصاصات (وصول كامل للمحاضرات)</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {ACADEMY_SPECIALTY_OPTIONS.filter((s) => s !== "GENERAL").map((s) => (
                          <label
                            key={s}
                            className={`flex items-center gap-2 text-sm cursor-pointer ${
                              form.academyAllowedSpecialties.includes(SPECIAL_ALL)
                                ? "opacity-40 pointer-events-none"
                                : ""
                            }`}
                          >
                            <Checkbox
                              checked={form.academyAllowedSpecialties.includes(s)}
                              disabled={form.academyAllowedSpecialties.includes(SPECIAL_ALL)}
                              onCheckedChange={() => toggleAllowedSpecialty(s)}
                            />
                            <span>{ACADEMY_SPECIALTY_LABELS[s]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      اختر "كل الاختصاصات" لمنح العضو وصولاً لكل المحاضرات، أو حدد اختصاصات معينة. اتركها فارغة للاكتفاء باختصاص العضو الأساسي. عند عدم التعديل لن تتغير القيمة الحالية.
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
