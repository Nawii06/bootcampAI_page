import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  id?: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
  showPrivacyWarning?: boolean;
  className?: string;
}

export function FormField({ 
  label, 
  id, 
  required, 
  description, 
  error, 
  children, 
  showPrivacyWarning,
  className 
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className={cn("text-sm font-medium", error ? "text-destructive" : "text-foreground")}>
          {label} {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {showPrivacyWarning && (
          <span className="text-[10px] text-destructive font-medium bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
            개인정보 입력 금지
          </span>
        )}
      </div>
      
      {children}
      
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      {error && (
        <p className="text-xs text-destructive font-medium">{error}</p>
      )}
    </div>
  );
}

export function PrivacyWarningNotice() {
  return (
    <div className="mb-6 p-3 bg-red-50 border border-destructive/20 rounded-md flex items-start text-sm text-destructive">
      <span className="mr-2 text-base leading-none">⚠️</span>
      <div>
        <strong className="font-bold">개인정보(이름, 연락처, 이메일, 실제 학번 등) 입력 금지</strong>
        <p className="mt-0.5 text-xs">이 화면은 SSO 연동 구조 검토용 mock 데모입니다. 테스트용 가상 데이터만 입력해주세요.</p>
      </div>
    </div>
  );
}
