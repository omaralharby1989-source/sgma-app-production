import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSignup } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2 } from "lucide-react";

const signupSchema = z.object({
  fullName: z.string().min(2, "الاسم الكامل مطلوب (على الأقل حرفين)"),
  account: z.string().min(3, "اسم المستخدم مطلوب (على الأقل 3 أحرف)"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  role: z.enum(["MEMBER", "MODERATOR", "ADMIN", "SUPER_ADMIN"]),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const signupMutation = useSignup();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      account: "",
      email: "",
      password: "",
      role: "MEMBER",
      phone: "",
      bio: "",
    },
  });

  const onSubmit = (data: z.infer<typeof signupSchema>) => {
    signupMutation.mutate({ data }, {
      onSuccess: (response) => {
        localStorage.setItem("sgma_auth_token", response.token);
        localStorage.setItem("sgma_auth_user", JSON.stringify(response.user));
        toast({ title: "تم التسجيل بنجاح" });
        setLocation("/member/profile");
      },
      onError: (error: any) => {
        toast({
          title: "خطأ في التسجيل",
          description: error?.data?.error || "الرجاء المحاولة مرة أخرى",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <UserPlus className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
          تسجيل حساب جديد
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          انضم إلى مجتمع SGMA APP2
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border">
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input 
                id="fullName" 
                type="text" 
                {...form.register("fullName")} 
                disabled={signupMutation.isPending}
              />
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">اسم المستخدم</Label>
              <Input 
                id="account" 
                type="text" 
                {...form.register("account")} 
                disabled={signupMutation.isPending}
                className="text-left"
                dir="ltr"
              />
              {form.formState.errors.account && (
                <p className="text-xs text-destructive">{form.formState.errors.account.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input 
                id="email" 
                type="email" 
                {...form.register("email")} 
                disabled={signupMutation.isPending}
                className="text-left"
                dir="ltr"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input 
                id="password" 
                type="password" 
                {...form.register("password")} 
                disabled={signupMutation.isPending}
                className="text-left"
                dir="ltr"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">الصلاحية</Label>
              <Select 
                disabled={signupMutation.isPending}
                value={form.watch("role")} 
                onValueChange={(val) => form.setValue("role", val as "MEMBER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصلاحية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">عضو (MEMBER)</SelectItem>
                  <SelectItem value="MODERATOR">مشرف (MODERATOR)</SelectItem>
                  <SelectItem value="ADMIN">مدير (ADMIN)</SelectItem>
                  <SelectItem value="SUPER_ADMIN">مدير عام (SUPER_ADMIN)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف (اختياري)</Label>
              <Input 
                id="phone" 
                type="tel" 
                {...form.register("phone")} 
                disabled={signupMutation.isPending}
                className="text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">نبذة تعريفية (اختياري)</Label>
              <Textarea 
                id="bio" 
                {...form.register("bio")} 
                disabled={signupMutation.isPending}
                className="resize-none"
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={signupMutation.isPending}>
              {signupMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "تسجيل"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm font-medium text-primary hover:underline">
              لديك حساب بالفعل؟ سجل دخولك
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
