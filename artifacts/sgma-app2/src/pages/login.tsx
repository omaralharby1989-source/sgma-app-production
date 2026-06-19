import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Eye, EyeOff } from "lucide-react";
import sgmaLogo from "@/assets/sgma-logo-3d-transparent.png";

const loginSchema = z.object({
  identifier: z.string().min(1, "مطلوب"),
  password: z.string().min(1, "مطلوب"),
  role: z.enum(["MEMBER", "MODERATOR", "ADMIN", "SUPER_ADMIN"]),
});

const forgotSchema = z.object({
  email: z.string().email("الرجاء إدخال بريد إلكتروني صحيح"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotPending, setForgotPending] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      role: "MEMBER",
    },
  });

  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: (response) => {
        localStorage.setItem("sgma_auth_token", response.token);
        localStorage.setItem("sgma_auth_user", JSON.stringify(response.user));
        toast({ title: "تم تسجيل الدخول بنجاح" });
        setLocation(
          response.user?.accessScope === "SYRIA_ACADEMY_ONLY" ? "/academy" : "/home",
        );
      },
      onError: (error: any) => {
        toast({
          title: "خطأ في تسجيل الدخول",
          description: error?.data?.error || "الرجاء المحاولة مرة أخرى",
          variant: "destructive",
        });
      }
    });
  };

  const onForgotSubmit = async (data: z.infer<typeof forgotSchema>) => {
    setForgotPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (!res.ok && res.status === 400) {
        const json = await res.json().catch(() => ({}));
        forgotForm.setError("email", { message: json?.error || "بريد إلكتروني غير صحيح" });
        return;
      }
      setForgotSuccess(true);
    } catch {
      toast({
        title: "خطأ في الاتصال",
        description: "الرجاء المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setForgotPending(false);
    }
  };

  if (forgotOpen) {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12 bg-background">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-6">
            <img
              src={sgmaLogo}
              alt="شعار الجمعية الطبية السورية الألمانية SGMA"
              className="h-auto w-[160px] max-w-[60vw] object-contain select-none drop-shadow-xl"
              draggable={false}
            />
          </div>
          <h2 className="text-center text-xl font-bold tracking-tight text-foreground">
            استعادة كلمة المرور
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-card pt-1.5 pb-8 px-0 shadow-lg shadow-primary/5 rounded-2xl border border-card-border overflow-hidden">
            <div className="h-1.5 w-full bg-sgma-gradient" />
            <div className="px-4 sm:px-10 pt-7">
              {forgotSuccess ? (
                <div className="space-y-5 text-center">
                  <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-sm text-green-800 leading-relaxed">
                    إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة لإعادة تعيين كلمة المرور.
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setForgotOpen(false);
                      setForgotSuccess(false);
                      forgotForm.reset();
                    }}
                  >
                    العودة إلى تسجيل الدخول
                  </Button>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={forgotForm.handleSubmit(onForgotSubmit)}>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">البريد الإلكتروني</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      {...forgotForm.register("email")}
                      disabled={forgotPending}
                      className="text-left"
                      dir="ltr"
                      placeholder="example@email.com"
                    />
                    {forgotForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{forgotForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold"
                    disabled={forgotPending}
                  >
                    {forgotPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "إرسال رابط إعادة التعيين"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={forgotPending}
                    onClick={() => {
                      setForgotOpen(false);
                      forgotForm.reset();
                    }}
                  >
                    إلغاء والعودة
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <img
            src={sgmaLogo}
            alt="شعار الجمعية الطبية السورية الألمانية SGMA"
            className="h-auto w-[210px] max-w-[70vw] object-contain select-none drop-shadow-xl"
            draggable={false}
          />
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
          SGMA APP
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          بوابة أعضاء الجمعية الطبية السورية الألمانية
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground/90 leading-relaxed max-w-xs mx-auto">
          منصة تربط الكفاءات الطبية السورية بين ألمانيا وسوريا، لأن سوريا تستحق
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card pt-1.5 pb-8 px-0 shadow-lg shadow-primary/5 rounded-2xl border border-card-border overflow-hidden">
          <div className="h-1.5 w-full bg-sgma-gradient" />
          <div className="px-4 sm:px-10 pt-7">
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            
            <div className="space-y-2">
              <Label htmlFor="identifier">اسم المستخدم أو البريد الإلكتروني</Label>
              <Input 
                id="identifier" 
                type="text" 
                {...form.register("identifier")} 
                disabled={loginMutation.isPending}
                className="text-left"
                dir="ltr"
              />
              {form.formState.errors.identifier && (
                <p className="text-xs text-destructive">{form.formState.errors.identifier.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  {...form.register("password")} 
                  disabled={loginMutation.isPending}
                  className="text-left pr-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 left-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="show-password"
                  checked={showPassword}
                  onCheckedChange={(v) => setShowPassword(v === true)}
                  disabled={loginMutation.isPending}
                />
                <Label
                  htmlFor="show-password"
                  className="text-sm font-normal text-muted-foreground cursor-pointer select-none"
                >
                  إظهار كلمة المرور
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">الصلاحية</Label>
              <Select 
                disabled={loginMutation.isPending}
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

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "دخول"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-sm text-primary hover:underline focus:outline-none"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link href="/register" className="text-sm font-medium text-primary hover:underline">
              ليس لديك حساب؟ سجل الآن
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
            <p className="text-sm font-medium text-foreground">لست عضواً في SGMA بعد؟</p>
            <a
              href="https://www.sgma-med.org/de/join-us"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-background px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              التسجيل على عضوية سجما
              <ExternalLink className="h-4 w-4" />
            </a>
            <p className="mt-2 text-xs text-muted-foreground">
              سيتم فتح موقع الجمعية الرسمي في نافذة جديدة.
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
