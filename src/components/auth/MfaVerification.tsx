import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Shield } from "lucide-react";
import { toast } from "sonner";

interface MfaVerificationProps {
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const MfaVerification = ({ factorId, onSuccess, onCancel }: MfaVerificationProps) => {
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    try {
      setVerifying(true);

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factorId,
        code: verificationCode,
      });

      if (error) throw error;

      toast.success("Verification successful!");
      onSuccess();
    } catch (error) {
      console.error("MFA verification error");
      toast.error("Invalid verification code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-primary/10">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold gradient-text mb-2">Two-Factor Authentication</h2>
          <p className="text-muted-foreground">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="space-y-2 w-full">
          <Label className="text-center block">Verification Code</Label>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={verificationCode}
              onChange={setVerificationCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <div className="flex gap-2 w-full">
          <Button
            onClick={handleVerify}
            disabled={verifying || verificationCode.length !== 6}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {verifying ? "Verifying..." : "Verify"}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={verifying}
            className="flex-1 border-primary/20"
          >
            Cancel
          </Button>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Don't have access to your authenticator? Contact support for assistance.
      </p>
    </div>
  );
};

export default MfaVerification;
