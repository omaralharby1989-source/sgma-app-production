import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import sgmaLogo from "@/assets/sgma-logo-3d-transparent.png";

const resetSchema = z
  .object({
    newPassword: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    confirmPassword: z.string().min(1, "الرجاء تأكيد كلمة المرور"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "كلمة المرور وتأكيدها غير متطابقتين",
    path: ["confirmPassword"],
  });

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: z.infer<typeof resetSchema>) => {
    if (!token) {
      toast({ title: "رابط غير صحيح", variant: "destructive" });
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "خطأ",
          description: json?.error || "الرجاء المحاولة مرة أخرى",
          variant: "destructive",
        });
        return;
      }
      setSuccess(true);
      toast({ title: "تم تحديث كلمة المرور بنجاح" });
    } catch {
      toast({
        title: "خطأ في الاتصال",
        description: "الرجاء المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

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
          إعادة تعيين كلمة المرور
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          أدخل كلمة المرور الجديدة
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card pt-1.5 pb-8 px-0 shadow-lg shadow-primary/5 rounded-2xl border border-card-border overflow-hidden">
          <div className="h-1.5 w-full bg-sgma-gradient" />
          <div className="px-4 sm:px-10 pt-7">
            {!token ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-destructive">
                  رابط إعادة التعيين غير صحيح أو منتهي الصلاحية.
                </p>
                <Button variant="outline" className="w-full" onClick={() => setLocation("/login")}>
                  العودة إلى تسجيل الدخول
                </Button>
              </div>
            ) : success ? (
              <div className="space-y-5 text-center">
                <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-sm text-green-800 leading-relaxed">
                  تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.
                </div>
                <Button className="w-full" onClick={() => setLocation("/login")}>
                  تسجيل الدخول
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      {...form.register("newPassword")}
                      disabled={isPending}
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
                  {form.formState.errors.newPassword && (
                    <p className="text-xs text-destructive">{form.formState.errors.newPassword.message}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="show-pw"
                      checked={showPassword}
                      onCheckedChange={(v) => setShowPassword(v === true)}
                      disabled={isPending}
                    />
                    <Label htmlFor="show-pw" className="text-sm font-normal text-muted-foreground cursor-pointer select-none">
                      إظهار كلمة المرور
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    {...form.register("confirmPassword")}
                    disabled={isPending}
                    className="text-left"
                    dir="ltr"
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "تحديث كلمة المرور"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setLocation("/login")}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    العودة إلى تسجيل الدخول
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
