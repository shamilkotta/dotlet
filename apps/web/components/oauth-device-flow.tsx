"use client";

import { useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { authClient } from "@/lib/auth-client";

type FlowStatus = "idle" | "verifying" | "verified" | "approving" | "approved" | "error";

function normalizeUserCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

export function OauthDeviceFlow({
  initialUserCode,
  verified,
  error: initialError,
}: {
  initialUserCode?: string;
  verified: boolean;
  error: string;
}) {
  const initialNormalizedCode = normalizeUserCode(initialUserCode ?? "");
  const [userCode, setUserCode] = useState(initialNormalizedCode);
  const [status, setStatus] = useState<FlowStatus>(
    verified ? "verified" : initialError ? "error" : "idle",
  );
  const [error, setError] = useState(initialError ?? "");
  const verifyRequestRef = useRef(0);
  const controller = useRef<AbortController>(new AbortController());

  function onCodeChange(value: string) {
    const normalized = normalizeUserCode(value);
    setUserCode(normalized);
    controller.current?.abort();
    controller.current = new AbortController();
    if (status === "approved" || status === "verified" || status === "error") {
      setStatus("idle");
    }

    if (error) {
      setError("");
    }

    if (normalized.length === 8) {
      setStatus("verifying");
      setError("");
      verifyCode(userCode);
    }
  }

  const verifyCode = async (code: string) => {
    const requestId = verifyRequestRef.current + 1;
    verifyRequestRef.current = requestId;
    const verifyResponse = await authClient.device({
      query: {
        user_code: code,
      },
      fetchOptions: {
        signal: controller.current.signal,
      },
    });
    if (verifyRequestRef.current !== requestId) {
      return;
    }
    if (verifyResponse.error) {
      setError(verifyResponse.error.error_description ?? "Invalid or expired code");
      setStatus("error");
      return;
    }
    setStatus("verified");
  };

  async function onAllow() {
    if (userCode.length !== 8) {
      setError("Enter the code from your device to authenticate it to your account.");
      return;
    }
    if (status !== "verified") {
      setError("Wait for verification to complete before allowing.");
      return;
    }
    setStatus("approving");
    setError("");

    const approveResponse = await authClient.device.approve({
      userCode,
    });
    if (approveResponse.error) {
      setError(approveResponse.error.error_description ?? "Approval failed");
      setStatus("error");
      return;
    }

    setStatus("approved");
  }

  const otpSlotClassName =
    "size-10 rounded-md border border-input bg-background text-base text-foreground first:rounded-md last:rounded-md dark:bg-input/30";

  return (
    <div className="w-full max-w-md text-center text-foreground">
      <h1 className="text-[2.15rem] font-semibold tracking-tight">
        {status === "approved" ? "Authorization successful" : "Authorize Device"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {status === "approved"
          ? "You can close this tab."
          : "Enter the code from your device to authenticate it to your account."}
      </p>

      <div className="mx-auto mt-6 flex max-w-[340px] justify-center">
        <InputOTP
          maxLength={8}
          value={userCode}
          onChange={onCodeChange}
          containerClassName="justify-center"
          autoFocus={!initialNormalizedCode}
          className="uppercase"
        >
          <InputOTPGroup className="gap-2 border-none bg-transparent">
            <InputOTPSlot index={0} className={otpSlotClassName} />
            <InputOTPSlot index={1} className={otpSlotClassName} />
            <InputOTPSlot index={2} className={otpSlotClassName} />
            <InputOTPSlot index={3} className={otpSlotClassName} />
          </InputOTPGroup>
          <InputOTPSeparator className="mx-2 text-muted-foreground [&_svg]:size-3" />
          <InputOTPGroup className="gap-2 border-none bg-transparent">
            <InputOTPSlot index={4} className={otpSlotClassName} />
            <InputOTPSlot index={5} className={otpSlotClassName} />
            <InputOTPSlot index={6} className={otpSlotClassName} />
            <InputOTPSlot index={7} className={otpSlotClassName} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="mt-3 min-h-5">
        <p className="text-center text-sm text-destructive">{error ? error : ""}</p>
      </div>

      {status !== "approved" ? (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={onAllow}
            disabled={status !== "verified"}
            className="h-10 w-full max-w-sm cursor-pointer px-6"
          >
            {status === "verifying"
              ? "Validating..."
              : status === "approving"
                ? "Authorize..."
                : "Authorize"}
          </Button>
        </div>
      ) : null}

      <div className="mt-20 flex justify-center gap-4 text-xs text-muted-foreground">
        <span>Terms</span>
        <span>Privacy Policy</span>
      </div>
    </div>
  );
}
