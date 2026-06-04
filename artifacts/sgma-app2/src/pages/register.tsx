import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSignup } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2 } from "lucide-react";
import { PROFESSION_GROUPS } from "@/lib/constants";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "الرجاء إدخال الاسم الكامل"),
    account: z.string().min(3, "الرجاء إدخال اسم المستخدم (على الأقل 3 أحرف)"),
    email: z.string().email("الرجاء إدخال بريد إلكتروني صحيح"),
    password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    confirmPassword: z.string().min(1, "الرجاء تأكيد كلمة المرور"),
    birthDate: z.string().min(1, "الرجاء إدخال تاريخ الميلاد"),
    address: z.string().min(1, "الرجاء إدخال العنوان الكامل"),
    phone: z.string().min(1, "الرجاء إدخال رقم الهاتف"),
    whatsapp: z.string().min(1, "الرجاء إدخال رقم الواتساب"),
    professionGroup: z.string().min(1, "الرجاء اختيار المجموعة المهنية"),
    specialtyText: z.string().min(1, "الرجاء كتابة الاختصاص بالتفصيل"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمة المرور وتأكيد كلمة المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const signupMutation = useSignup();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      account: "",
      email: "",
      password: "",
      confirmPassword: "",
      birthDate: "",
      address: "",
      phone: "",
      whatsapp: "",
      professionGroup: "",
      specialtyText: "",
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = (data: RegisterForm) => {
    signupMutation.mutate(
      {
        data: {
          fullName: data.fullName,
          account: data.account,
          email: data.email,
          password: data.password,
          birthDate: data.birthDate,
          address: data.address,
          phone: data.phone,
          whatsapp: data.whatsapp,
          professionGroup: data.professionGroup,
          specialtyText: data.specialtyText,
        },
      },
      {
        onSuccess: (response) => {
          localStorage.setItem("sgma_auth_token", response.token);
          localStorage.setItem("sgma_auth_user", JSON.stringify(response.user));
          toast({ title: "تم التسجيل بنجاح" });
          setLocation("/home");
        },
        onError: (error: any) => {
          toast({
            title: "خطأ في التسجيل",
            description: error?.data?.error || "الرجاء المحاولة مرة أخرى",
            variant: "destructive",
          });
        },
      },
    );
  };

  const isPending = signupMutation.isPending;

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
          <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)} noValidate>

            <section className="space-y-5">
              <h3 className="text-base font-bold text-foreground border-b border-border pb-2">
                معلومات الحساب
              </h3>

              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input id="fullName" type="text" {...form.register("fullName")} disabled={isPending} />
                {form.formState.errors.fullName && (
                  <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">اسم المستخدم</Label>
                <Input id="account" type="text" {...form.register("account")} disabled={isPending} className="text-left" dir="ltr" />
                {form.formState.errors.account && (
                  <p className="text-xs text-destructive">{form.formState.errors.account.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" {...form.register("email")} disabled={isPending} className="text-left" dir="ltr" />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" type="password" {...form.register("password")} disabled={isPending} className="text-left" dir="ltr" />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} disabled={isPending} className="text-left" dir="ltr" />
                {form.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </section>

            <section className="space-y-5">
              <h3 className="text-base font-bold text-foreground border-b border-border pb-2">
                المعلومات الشخصية
              </h3>

              <div className="space-y-2">
                <Label htmlFor="birthDate">تاريخ الميلاد</Label>
                <Input id="birthDate" type="date" {...form.register("birthDate")} disabled={isPending} className="text-left" dir="ltr" />
                {form.formState.errors.birthDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.birthDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">العنوان الكامل</Label>
                <Input id="address" type="text" {...form.register("address")} disabled={isPending} />
                {form.formState.errors.address && (
                  <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input id="phone" type="tel" {...form.register("phone")} disabled={isPending} className="text-left" dir="ltr" />
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">رقم الواتساب</Label>
                <Input id="whatsapp" type="tel" {...form.register("whatsapp")} disabled={isPending} className="text-left" dir="ltr" />
                {form.formState.errors.whatsapp && (
                  <p className="text-xs text-destructive">{form.formState.errors.whatsapp.message}</p>
                )}
              </div>
            </section>

            <section className="space-y-5">
              <h3 className="text-base font-bold text-foreground border-b border-border pb-2">
                المعلومات المهنية
              </h3>

              <div className="space-y-2">
                <Label htmlFor="professionGroup">المجموعة المهنية</Label>
                <Select
                  disabled={isPending}
                  value={form.watch("professionGroup")}
                  onValueChange={(val) => form.setValue("professionGroup", val, { shouldValidate: true })}
                >
                  <SelectTrigger id="professionGroup">
                    <SelectValue placeholder="اختر المجموعة المهنية" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFESSION_GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.professionGroup && (
                  <p className="text-xs text-destructive">{form.formState.errors.professionGroup.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialtyText">الاختصاص بالتفصيل</Label>
                <Textarea
                  id="specialtyText"
                  {...form.register("specialtyText")}
                  disabled={isPending}
                  className="resize-none"
                  rows={3}
                  placeholder="اكتب اختصاصك بالتفصيل، مثال: Anästhesie, Intensivpflege, Notaufnahme, Chirurgie, Innere Medizin..."
                />
                {form.formState.errors.specialtyText && (
                  <p className="text-xs text-destructive">{form.formState.errors.specialtyText.message}</p>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-foreground border-b border-border pb-2">
                الموافقة
              </h3>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="acceptTerms"
                  checked={form.watch("acceptTerms")}
                  onCheckedChange={(checked) =>
                    form.setValue("acceptTerms", (checked === true) as true, { shouldValidate: true })
                  }
                  disabled={isPending}
                  className="mt-0.5"
                />
                <Label htmlFor="acceptTerms" className="text-sm font-normal leading-snug cursor-pointer">
                  أوافق على شروط الاستخدام وسياسة الخصوصية
                </Label>
              </div>
              {form.formState.errors.acceptTerms && (
                <p className="text-xs text-destructive">{form.formState.errors.acceptTerms.message}</p>
              )}
            </section>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "تسجيل"}
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
