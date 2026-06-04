import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetMemberProfile, 
  useGetMemberStats,
  useUpdateMemberProfile,
  useUpdateMemberPassword,
  useUploadMemberAvatar,
  getGetMemberProfileQueryKey,
  getGetMemberStatsQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Camera, Loader2, CalendarDays, Activity, ShieldCheck, Mail, Phone, AtSign, Settings, Key } from "lucide-react";
import { useState, useRef } from "react";
const ROLE_ARABIC: Record<string, string> = {
  MEMBER: "عضو",
  MODERATOR: "مشرف",
  ADMIN: "مدير",
  SUPER_ADMIN: "مدير عام",
};

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "نشط", color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" },
  PENDING: { label: "قيد الانتظار", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20" },
  SUSPENDED: { label: "موقوف", color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" },
};

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: isLoadingProfile } = useGetMemberProfile();
  const { data: stats, isLoading: isLoadingStats } = useGetMemberStats();

  const updateProfile = useUpdateMemberProfile();
  const updatePassword = useUpdateMemberPassword();
  const uploadAvatar = useUploadMemberAvatar();

  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("sgma_auth_token");
    localStorage.removeItem("sgma_auth_user");
    setLocation("/login");
  };

  const handleEditInit = () => {
    if (profile) {
      setEditFullName(profile.fullName || "");
      setEditPhone(profile.phone || "");
      setEditBio(profile.bio || "");
      setIsEditing(true);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      await updateProfile.mutateAsync({
        data: {
          fullName: editFullName,
          phone: editPhone,
          bio: editBio,
        }
      });
      toast({ title: "تم تحديث الملف الشخصي بنجاح" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: getGetMemberProfileQueryKey() });
    } catch (err: any) {
      toast({ 
        title: "حدث خطأ", 
        description: err?.data?.error || "تعذر تحديث الملف الشخصي",
        variant: "destructive" 
      });
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || newPassword.length < 6) {
      toast({ 
        title: "خطأ", 
        description: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive" 
      });
      return;
    }

    try {
      await updatePassword.mutateAsync({
        data: {
          currentPassword,
          newPassword,
        }
      });
      toast({ title: "تم تغيير كلمة المرور بنجاح" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast({ 
        title: "حدث خطأ", 
        description: err?.data?.error || "تعذر تغيير كلمة المرور",
        variant: "destructive" 
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
        await uploadAvatar.mutateAsync({
          data: {
            imageData: base64
          }
        });
        toast({ title: "تم تحديث الصورة الشخصية" });
        queryClient.invalidateQueries({ queryKey: getGetMemberProfileQueryKey() });
      } catch (err: any) {
        toast({ 
          title: "حدث خطأ", 
          description: "تعذر رفع الصورة",
          variant: "destructive" 
        });
      }
    };
    reader.readAsDataURL(file);
  };

  if (isLoadingProfile || isLoadingStats) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile) return null;

  const statusInfo = STATUS_INFO[profile.status] || STATUS_INFO.PENDING;

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      
      {/* Header Profile Card */}
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

      {/* Stats Quick View */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">عضو منذ</p>
                <p className="font-semibold text-sm">{new Date(stats.memberSince).toLocaleDateString('ar-EG')}</p>
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

      {/* Main Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="info">المعلومات</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">البيانات الشخصية</CardTitle>
                {!isEditing && (
                  <Button variant="ghost" size="sm" onClick={handleEditInit} className="h-8">
                    تعديل
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>الاسم الكامل</Label>
                    <Input value={editFullName} onChange={e => setEditFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} dir="ltr" className="text-left" />
                  </div>
                  <div className="space-y-2">
                    <Label>النبذة</Label>
                    <Textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} className="resize-none" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleProfileUpdate} disabled={updateProfile.isPending} className="flex-1">
                      {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      حفظ
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">إلغاء</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <AtSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">اسم المستخدم</p>
                      <p className="text-sm font-medium" dir="ltr">{profile.account}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                      <p className="text-sm font-medium" dir="ltr">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                      <p className="text-sm font-medium" dir="ltr">{profile.phone || "—"}</p>
                    </div>
                  </div>
                  {profile.bio && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">النبذة</p>
                      <p className="text-sm">{profile.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label>كلمة المرور الحالية</Label>
                  <Input 
                    type="password" 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)}
                    dir="ltr" className="text-left"
                    disabled={updatePassword.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور الجديدة</Label>
                  <Input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    dir="ltr" className="text-left"
                    disabled={updatePassword.isPending}
                  />
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
