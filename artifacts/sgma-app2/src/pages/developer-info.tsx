import { useState } from "react";
import {
  useGetDeveloperInfo,
  useUpdateDeveloperInfo,
  getGetDeveloperInfoQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, Briefcase, UserRound, Building2, Pencil, Save, X, Loader2 } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { useToast } from "@/hooks/use-toast";
import { getStoredUser, isDeveloperUser } from "@/lib/auth";

export default function DeveloperInfo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: info, isLoading, isError } = useGetDeveloperInfo();

  const canEdit = isDeveloperUser(getStoredUser());
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name: "",
    title: "",
    description: "",
    roleDescription: "",
    phone: "",
    email: "",
  });

  const updateMutation = useUpdateDeveloperInfo({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDeveloperInfoQueryKey() });
        setEditing(false);
        toast({
          title: "تم تحديث معلومات المطور بنجاح",
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "تعذر تحديث المعلومات",
          description: "يرجى التحقق من البيانات والمحاولة مرة أخرى.",
        });
      },
    },
  });

  const startEdit = () => {
    if (!info) return;
    setForm({
      name: info.name ?? "",
      title: info.title ?? "",
      description: info.description ?? "",
      roleDescription: info.roleDescription ?? "",
      phone: info.phone ?? "",
      email: info.email ?? "",
    });
    setEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const title = form.title.trim();
    const description = form.description.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!name || !title || !description || !phone || !email) {
      toast({
        variant: "destructive",
        title: "بيانات ناقصة",
        description: "يرجى تعبئة جميع الحقول المطلوبة.",
      });
      return;
    }
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) {
      toast({
        variant: "destructive",
        title: "بريد إلكتروني غير صالح",
        description: "يرجى إدخال بريد إلكتروني صحيح.",
      });
      return;
    }

    updateMutation.mutate({
      data: {
        name,
        title,
        description,
        phone,
        email,
        roleDescription: form.roleDescription.trim() || null,
      },
    });
  };

  return (
    <div className="min-h-[100dvh] bg-muted/20 p-4 max-w-lg mx-auto">
      <BroadcastBanner />
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-xl font-bold">معلومات المطور</h1>
        <BackButton fallback="/more" />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError || !info ? (
        <p className="text-center text-muted-foreground mt-10">تعذر تحميل معلومات المطور</p>
      ) : editing ? (
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              تعديل معلومات المطور
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="di-name">اسم المطور</Label>
                <Input
                  id="di-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="di-title">المسمى</Label>
                <Input
                  id="di-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="di-desc">الوصف المهني</Label>
                <Textarea
                  id="di-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  maxLength={2000}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="di-role">الدور في SGMA (اختياري)</Label>
                <Textarea
                  id="di-role"
                  value={form.roleDescription}
                  onChange={(e) => setForm((f) => ({ ...f, roleDescription: e.target.value }))}
                  rows={4}
                  maxLength={2000}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="di-phone">رقم الهاتف</Label>
                <Input
                  id="di-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  dir="ltr"
                  maxLength={40}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="di-email">البريد الإلكتروني</Label>
                <Input
                  id="di-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  dir="ltr"
                  maxLength={160}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="flex-1 gap-2" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  حفظ التعديلات
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setEditing(false)}
                  disabled={updateMutation.isPending}
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="border-primary/20 shadow-sm bg-gradient-to-br from-card to-primary/5">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-4">
                <UserRound className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-primary">{info.name}</h2>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                {info.title}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                الوصف المهني
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm leading-relaxed text-foreground/90">{info.description}</p>
            </CardContent>
          </Card>

          {info.roleDescription && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  الدور في SGMA
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm leading-relaxed text-foreground/90">{info.roleDescription}</p>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                التواصل
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate" dir="ltr">{info.phone}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate" dir="ltr">{info.email}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button asChild className="gap-2">
                  <a href={`tel:${info.phone}`}>
                    <Phone className="h-4 w-4" />
                    اتصال هاتفي
                  </a>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <a href={`mailto:${info.email}`}>
                    <Mail className="h-4 w-4" />
                    إرسال بريد إلكتروني
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {canEdit && (
            <Button onClick={startEdit} variant="secondary" className="w-full gap-2">
              <Pencil className="h-4 w-4" />
              تعديل معلومات المطور
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
