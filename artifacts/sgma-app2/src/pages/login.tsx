import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import sgmaLogo from "@/assets/sgma-logo.png";

const loginSchema = z.object({
  identifier: z.string().min(1, "مطلوب"),
  password: z.string().min(1, "مطلوب"),
  role: z.enum(["MEMBER", "MODERATOR", "ADMIN", "SUPER_ADMIN"]),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      role: "MEMBER",
    },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: (response) => {
        localStorage.setItem("sgma_auth_token", response.token);
        localStorage.setItem("sgma_auth_user", JSON.stringify(response.user));
        toast({ title: "تم تسجيل الدخول بنجاح" });
        setLocation("/home");
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

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="rounded-2xl bg-black p-4 shadow-lg ring-1 ring-white/10">
            <img
              src={sgmaLogo}
              alt="شعار الجمعية الطبية السورية الألمانية SGMA"
              className="h-auto w-[180px] max-w-[260px] select-none"
              draggable={false}
            />
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
          SGMA APP
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          بوابة أعضاء الجمعية الطبية السورية الألمانية
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border">
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
              <Input 
                id="password" 
                type="password" 
                {...form.register("password")} 
                disabled={loginMutation.isPending}
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
          </form>

          <div className="mt-6 text-center">
            <Link href="/register" className="text-sm font-medium text-primary hover:underline">
              ليس لديك حساب؟ سجل الآن
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
