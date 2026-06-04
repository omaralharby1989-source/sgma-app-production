import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetMemberProfile,
  useGetMemberStats,
  useUpdateMemberProfile,
  useUpdateMemberPassword,
  useUploadMemberAvatar,
  getGetMemberProfileQueryKey,
  getGetMemberStatsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Camera, Loader2, CalendarDays, Activity, Key, Pencil } from "lucide-react";
import { useState, useRef } from "react";
import { PROFESSION_GROUPS, ROLE_ARABIC, STATUS_INFO } from "@/lib/constants";

const profileSchema = z.object({
  fullName: z.string().min(2, "الرجاء إدخال الاسم الكامل"),
  account: z.string().min(3, "الرجاء إدخال اسم المستخدم (على الأقل 3 أحرف)"),
  email: z.string().email("الرجاء إدخال بريد إلكتروني صحيح"),
  birthDate: z.string().min(1, "الرجاء إدخال تاريخ الميلاد"),
  address: z.string().min(1, "الرجاء إدخال العنوان الكامل"),
  phone: z.string().min(1, "الرجاء إدخال رقم الهاتف"),
  whatsapp: z.string().min(1, "الرجاء إدخال رقم الواتساب"),
  professionGroup: z.string().min(1, "الرجاء اختيار المجموعة المهنية"),
  specialtyText: z.string().min(1, "الرجاء كتابة الاختصاص بالتفصيل"),
  bio: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "الرجاء إدخال كلمة المرور الحالية"),
    newPassword: z.string().min(6, "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"),
    confirmNewPassword: z.string().min(1, "الرجاء تأكيد كلمة المرور الجديدة"),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "كلمة المرور الجديدة وتأكيدها غير متطابقتين",
    path: ["confirmNewPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function InfoRow({ label, value, dir }: { label: string; value: string | null | undefined; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words" dir={dir}>
        {value || "—"}
      </span>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: isLoadingProfile } = useGetMemberProfile();
  const { data: stats, isLoading: isLoadingStats } = useGetMemberStats();

  const updateProfile = useUpdateMemberProfile();
  const updatePassword = useUpdateMemberPassword();
  const uploadAvatar = useUploadMemberAvatar();

  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      account: "",
      email: "",
      birthDate: "",
      address: "",
      phone: "",
      whatsapp: "",
      professionGroup: "",
      specialtyText: "",
      bio: "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const handleLogout = () => {
    localStorage.removeItem("sgma_auth_token");
    localStorage.removeItem("sgma_auth_user");
    setLocation("/login");
  };

  const handleEditInit = () => {
    if (!profile) return;
    form.reset({
      fullName: profile.fullName || "",
      account: profile.account || "",
      email: profile.email || "",
      birthDate: profile.birthDate || "",
      address: profile.address || "",
      phone: profile.phone || "",
      whatsapp: profile.whatsapp || "",
      professionGroup: profile.professionGroup || "",
      specialtyText: profile.specialtyText || "",
      bio: profile.bio || "",
    });
    setIsEditing(true);
  };

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      await updateProfile.mutateAsync({
        data: {
          fullName: data.fullName,
          account: data.account,
          email: data.email,
          birthDate: data.birthDate,
          address: data.address,
          phone: data.phone,
          whatsapp: data.whatsapp,
          professionGroup: data.professionGroup,
          specialtyText: data.specialtyText,
          bio: data.bio ?? null,
        },
      });
      toast({ title: "تم تحديث الملف الشخصي بنجاح" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: getGetMemberProfileQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMemberStatsQueryKey() });
    } catch (err: any) {
      toast({
        title: "حدث خطأ",
        description: err?.data?.error || "تعذر تحديث الملف الشخصي",
        variant: "destructive",
      });
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      await updatePassword.mutateAsync({
        data: { currentPassword: data.currentPassword, newPassword: data.newPassword },
      });
      toast({ title: "تم تغيير كلمة المرور بنجاح" });
      passwordForm.reset();
    } catch (err: any) {
      toast({
        title: "حدث خطأ",
        description: err?.data?.error || "تعذر تغيير كلمة المرور",
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await uploadAvatar.mutateAsync({ data: { imageData: base64 } });
        toast({ title: "تم تحديث الصورة الشخصية" });
        queryClient.invalidateQueries({ queryKey: getGetMemberProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMemberStatsQueryKey() });
      } catch {
        toast({ title: "حدث خطأ", description: "تعذر رفع الصورة", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
  };

  if (isLoadingProfile || isLoadingStats) {
    return (
      <div className="p-4 space-y-4 pb-28">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile) return null;

  const statusInfo = STATUS_INFO[profile.status] || STATUS_INFO.PENDING;
  const isPending = updateProfile.isPending;

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-28">

      <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-muted">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
              <AvatarImage src={profile.avatarUrl || ""} />
              <AvatarFallback className="text-2xl">{profile.fullName.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full shadow-md hover:bg-primary/90 transition-colors"
              aria-label="تغيير الصورة"
            >
              {uploadAvatar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
            />
          </div>

          <h2 className="text-xl font-bold">{profile.fullName}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="font-normal bg-background">
              {ROLE_ARABIC[profile.role] || profile.role}
            </Badge>
            <Badge variant="outline" className={`font-normal ${statusInfo.color}`}>
              {statusInfo.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">عضو منذ</p>
                <p className="font-semibold text-sm">{new Date(stats.memberSince).toLocaleDateString("ar-EG")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">أيام النشاط</p>
                <p className="font-semibold text-sm">{stats.daysActive} يوم</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="info">المعلومات</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          {isEditing ? (
            <form onSubmit={form.handleSubmit(onProfileSubmit)} noValidate className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base">معلومات الحساب</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>الاسم الكامل</Label>
                    <Input {...form.register("fullName")} disabled={isPending} />
                    {form.formState.errors.fullName && <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input {...form.register("account")} disabled={isPending} dir="ltr" className="text-left" />
                    {form.formState.errors.account && <p className="text-xs text-destructive">{form.formState.errors.account.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input type="email" {...form.register("email")} disabled={isPending} dir="ltr" className="text-left" />
                    {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base">المعلومات الشخصية</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>تاريخ الميلاد</Label>
                    <Input type="date" {...form.register("birthDate")} disabled={isPending} dir="ltr" className="text-left" />
                    {form.formState.errors.birthDate && <p className="text-xs text-destructive">{form.formState.errors.birthDate.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>العنوان الكامل</Label>
                    <Input {...form.register("address")} disabled={isPending} />
                    {form.formState.errors.address && <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input type="tel" {...form.register("phone")} disabled={isPending} dir="ltr" className="text-left" />
                    {form.formState.errors.phone && <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الواتساب</Label>
                    <Input type="tel" {...form.register("whatsapp")} disabled={isPending} dir="ltr" className="text-left" />
                    {form.formState.errors.whatsapp && <p className="text-xs text-destructive">{form.formState.errors.whatsapp.message}</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base">المعلومات المهنية</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>المجموعة المهنية</Label>
                    <Select
                      disabled={isPending}
                      value={form.watch("professionGroup")}
                      onValueChange={(val) => form.setValue("professionGroup", val, { shouldValidate: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المجموعة المهنية" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROFESSION_GROUPS.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.professionGroup && <p className="text-xs text-destructive">{form.formState.errors.professionGroup.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>الاختصاص بالتفصيل</Label>
                    <Textarea {...form.register("specialtyText")} disabled={isPending} rows={3} className="resize-none" />
                    {form.formState.errors.specialtyText && <p className="text-xs text-destructive">{form.formState.errors.specialtyText.message}</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base">نبذة تعريفية</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <Textarea {...form.register("bio")} disabled={isPending} rows={3} className="resize-none" placeholder="اكتب نبذة تعريفية عنك (اختياري)" />
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  حفظ التعديلات
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isPending} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleEditInit} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  تعديل
                </Button>
              </div>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base">معلومات الحساب</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <InfoRow label="الاسم الكامل" value={profile.fullName} />
                  <InfoRow label="اسم المستخدم" value={profile.account} dir="ltr" />
                  <InfoRow label="البريد الإلكتروني" value={profile.email} dir="ltr" />
                  <InfoRow label="تاريخ إنشاء الحساب" value={formatDate(profile.createdAt)} />
                  <InfoRow label="الصلاحية" value={ROLE_ARABIC[profile.role] || profile.role} />
                  <InfoRow label="حالة الحساب" value={statusInfo.label} />
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base">المعلومات الشخصية</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <InfoRow label="تاريخ الميلاد" value={formatDate(profile.birthDate)} />
                  <InfoRow label="العنوان الكامل" value={profile.address} />
                  <InfoRow label="رقم الهاتف" value={profile.phone} dir="ltr" />
                  <InfoRow label="رقم الواتساب" value={profile.whatsapp} dir="ltr" />
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base">المعلومات المهنية</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <InfoRow label="المجموعة المهنية" value={profile.professionGroup} />
                  <InfoRow label="الاختصاص بالتفصيل" value={profile.specialtyText} />
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base">نبذة تعريفية</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {profile.bio ? (
                    <p className="text-sm leading-relaxed">{profile.bio}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">لم يتم إضافة نبذة تعريفية بعد</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                تغيير كلمة المرور
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate className="space-y-4">
                <div className="space-y-2">
                  <Label>كلمة المرور الحالية</Label>
                  <Input type="password" {...passwordForm.register("currentPassword")} dir="ltr" className="text-left" disabled={updatePassword.isPending} />
                  {passwordForm.formState.errors.currentPassword && <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور الجديدة</Label>
                  <Input type="password" {...passwordForm.register("newPassword")} dir="ltr" className="text-left" disabled={updatePassword.isPending} />
                  {passwordForm.formState.errors.newPassword && <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>تأكيد كلمة المرور الجديدة</Label>
                  <Input type="password" {...passwordForm.register("confirmNewPassword")} dir="ltr" className="text-left" disabled={updatePassword.isPending} />
                  {passwordForm.formState.errors.confirmNewPassword && <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmNewPassword.message}</p>}
                </div>
                <Button type="submit" disabled={updatePassword.isPending} className="w-full">
                  {updatePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  تحديث كلمة المرور
                </Button>
              </form>
            </CardContent>
          </Card>

          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            <LogOut className="ml-2 h-4 w-4" />
            تسجيل الخروج
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
