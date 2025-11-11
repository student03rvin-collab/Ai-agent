import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Shield, ShieldCheck, AlertTriangle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface TwoFactorSetupProps {
  userId: string;
}

const TwoFactorSetup = ({ userId }: TwoFactorSetupProps) => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    checkMfaStatus();
  }, [userId]);

  const checkMfaStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;

      const hasEnabledFactor = data?.totp?.some((factor) => factor.status === 'verified');
      setMfaEnabled(hasEnabledFactor || false);
    } catch (error) {
      console.error("Error checking MFA status");
      toast.error("Failed to check 2FA status");
    } finally {
      setLoading(false);
    }
  };

  const startEnrollment = async () => {
    try {
      setEnrolling(true);
      
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;

      if (data) {
        setFactorId(data.id);
        setSecret(data.totp.secret);
        
        // Generate QR code
        const otpauthUrl = data.totp.uri;
        const qrCode = await QRCode.toDataURL(otpauthUrl);
        setQrCodeUrl(qrCode);
      }
    } catch (error) {
      console.error("Error starting enrollment");
      toast.error("Failed to start 2FA setup");
      setEnrolling(false);
    }
  };

  const verifyAndEnable = async () => {
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

      toast.success("2FA enabled successfully!");
      
      // Generate secure recovery codes via edge function
      try {
        const { data: codesData, error: codesError } = await supabase.functions.invoke(
          'generate-recovery-codes',
          {
            headers: {
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
          }
        );

        if (codesError) {
          console.error("Error generating recovery codes:", codesError);
          toast.error("Failed to generate recovery codes. Please contact support.");
        } else if (codesData?.recovery_codes) {
          setRecoveryCodes(codesData.recovery_codes);
        }
      } catch (error) {
        console.error("Error calling recovery codes function:", error);
        toast.error("Failed to generate recovery codes. Please contact support.");
      }
      
      setMfaEnabled(true);
      setEnrolling(false);
      setVerificationCode("");
    } catch (error) {
      console.error("Error verifying code");
      toast.error("Invalid verification code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const disableMfa = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      if (!factors?.totp || factors.totp.length === 0) {
        toast.error("No 2FA factors found");
        return;
      }

      const factor = factors.totp[0];
      
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });

      if (error) throw error;

      toast.success("2FA disabled successfully");
      setMfaEnabled(false);
      setRecoveryCodes([]);
    } catch (error) {
      console.error("Error disabling MFA");
      toast.error("Failed to disable 2FA");
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const copyAllRecoveryCodes = async () => {
    try {
      const allCodes = recoveryCodes.join('\n');
      await navigator.clipboard.writeText(allCodes);
      toast.success("All recovery codes copied");
    } catch (error) {
      toast.error("Failed to copy codes");
    }
  };

  if (loading) {
    return (
      <Card className="glass border-primary/20 p-6">
        <p className="text-muted-foreground">Loading 2FA settings...</p>
      </Card>
    );
  }

  return (
    <Card className="glass border-primary/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Two-Factor Authentication</h2>
        </div>
        {mfaEnabled && (
          <div className="flex items-center gap-2 text-green-500">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-medium">Enabled</span>
          </div>
        )}
      </div>

      <Separator className="mb-6" />

      {!mfaEnabled && !enrolling && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Add an extra layer of security to your account. You'll need to enter a code from your authenticator app when signing in.
          </p>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Make sure you have an authenticator app installed (Google Authenticator, Authy, 1Password, etc.) before proceeding.
            </AlertDescription>
          </Alert>

          <Button
            onClick={startEnrollment}
            className="bg-primary hover:bg-primary/90"
          >
            <Shield className="w-4 h-4 mr-2" />
            Enable 2FA
          </Button>
        </div>
      )}

      {enrolling && !mfaEnabled && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Scan QR Code</h3>
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app:
            </p>
            
            {qrCodeUrl && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Or enter this code manually:</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={secret}
                  readOnly
                  className="font-mono text-sm bg-background/50 border-primary/20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(secret)}
                  className="border-primary/20"
                >
                  {copiedCode === secret ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 2: Verify Setup</h3>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app:
            </p>
            
            <div className="flex flex-col items-center gap-4">
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

              <div className="flex gap-2">
                <Button
                  onClick={verifyAndEnable}
                  disabled={verifying || verificationCode.length !== 6}
                  className="bg-primary hover:bg-primary/90"
                >
                  {verifying ? "Verifying..." : "Verify & Enable"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEnrolling(false);
                    setVerificationCode("");
                    setQrCodeUrl("");
                  }}
                  className="border-primary/20"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {recoveryCodes.length > 0 && (
        <div className="space-y-4 mt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Save these recovery codes!</strong> You can use them to access your account if you lose your authenticator device.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recovery Codes</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAllRecoveryCodes}
                className="border-primary/20"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy All
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 bg-background/50 rounded-lg border border-primary/20">
              {recoveryCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-background rounded font-mono text-sm"
                >
                  <span>{code}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(code)}
                    className="h-6 w-6 p-0"
                  >
                    {copiedCode === code ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mfaEnabled && recoveryCodes.length === 0 && (
        <div className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              Two-factor authentication is active on your account. You'll need to enter a code from your authenticator app when signing in.
            </AlertDescription>
          </Alert>

          <Button
            variant="destructive"
            onClick={disableMfa}
          >
            Disable 2FA
          </Button>
        </div>
      )}
    </Card>
  );
};

export default TwoFactorSetup;
