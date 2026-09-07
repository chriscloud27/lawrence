"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ctaFormSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1),
  message: z.string().optional(),
});

type CtaFormValues = z.infer<typeof ctaFormSchema>;

export default function CtaForm() {
  const t = useTranslations("form");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CtaFormValues>({
    resolver: zodResolver(ctaFormSchema),
  });

  const onSubmit = async () => {
    // No backend endpoint exists yet — surface the intended success state
    // so the form is demoable without a fabricated integration.
    setStatus("success");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-lw-base sm:grid-cols-2"
    >
      <div>
        <Label htmlFor="firstName">{t("firstName")}</Label>
        <Input
          id="firstName"
          className="mt-lw-xs"
          placeholder={t("firstNamePlaceholder")}
          {...register("firstName")}
        />
        {errors.firstName && (
          <p className="mt-lw-xs text-[13px] text-lw-error">{t("validation.required")}</p>
        )}
      </div>
      <div>
        <Label htmlFor="lastName">{t("lastName")}</Label>
        <Input
          id="lastName"
          className="mt-lw-xs"
          placeholder={t("lastNamePlaceholder")}
          {...register("lastName")}
        />
        {errors.lastName && (
          <p className="mt-lw-xs text-[13px] text-lw-error">{t("validation.required")}</p>
        )}
      </div>
      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          className="mt-lw-xs"
          placeholder={t("emailPlaceholder")}
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-lw-xs text-[13px] text-lw-error">{t("validation.email")}</p>
        )}
      </div>
      <div>
        <Label htmlFor="company">{t("company")}</Label>
        <Input
          id="company"
          className="mt-lw-xs"
          placeholder={t("companyPlaceholder")}
          {...register("company")}
        />
        {errors.company && (
          <p className="mt-lw-xs text-[13px] text-lw-error">{t("validation.required")}</p>
        )}
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="message">{t("message")}</Label>
        <Textarea
          id="message"
          className="mt-lw-xs"
          placeholder={t("messagePlaceholder")}
          {...register("message")}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
        {status === "success" && (
          <p className="mt-lw-sm text-[14px] text-lw-accent">{t("success")}</p>
        )}
        {status === "error" && (
          <p className="mt-lw-sm text-[14px] text-lw-error">{t("error")}</p>
        )}
      </div>
    </form>
  );
}
