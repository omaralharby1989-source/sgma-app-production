import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ImageOff } from "lucide-react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageInput({
  value,
  onChange,
  label = "صورة",
  disabled = false,
  maxSizeMB = 2,
  helperText,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  maxSizeMB?: number;
  helperText?: string;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewError, setPreviewError] = useState(false);

  const isBase64 = value.startsWith("data:");
  const hasImage = value.trim().length > 0;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "نوع الصورة غير مدعوم",
        description: "يُسمح بصيغ JPG أو PNG أو WEBP فقط.",
      });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "حجم الصورة كبير جداً، يرجى اختيار صورة أصغر",
        description: `الحد الأقصى ${maxSizeMB} ميجابايت.`,
      });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewError(false);
      onChange(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "تعذر تحميل الصورة" });
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  function clearImage() {
    onChange("");
    setPreviewError(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">رابط الصورة</span>
        <Input
          value={isBase64 ? "" : value}
          onChange={(e) => {
            setPreviewError(false);
            onChange(e.target.value);
          }}
          placeholder="أدخل رابط الصورة إن وجد"
          dir="ltr"
          disabled={disabled || isBase64}
        />
      </div>

      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">أو ارفع صورة من جهازك</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          disabled={disabled}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          اختيار صورة
        </Button>
      </div>

      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}

      {hasImage && (
        <div className="space-y-2 pt-1">
          <div className="relative overflow-hidden rounded-lg border bg-muted">
            {previewError ? (
              <div className="flex h-40 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageOff className="h-8 w-8 opacity-50" />
                <span className="text-xs">تعذر تحميل الصورة</span>
              </div>
            ) : (
              <img
                src={value}
                alt="معاينة الصورة"
                onError={() => setPreviewError(true)}
                className="h-40 w-full object-cover"
              />
            )}
          </div>
          {isBase64 && (
            <p className="text-xs text-muted-foreground">صورة مرفوعة من الجهاز</p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            disabled={disabled}
            onClick={clearImage}
          >
            <X className="h-4 w-4" />
            إزالة الصورة
          </Button>
        </div>
      )}
    </div>
  );
}
