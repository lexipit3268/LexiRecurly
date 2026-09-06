import { useSignIn } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClerkError {
  code: string;
  message: string;
  longMessage?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapClerkError(err: ClerkError | null): string {
  if (!err) return "Something went wrong. Please try again.";
  switch (err.code) {
    case "form_identifier_not_found":
      return "No account found with this email address.";
    case "too_many_requests":
      return "Too many attempts. Please wait a moment.";
    default:
      return err.longMessage ?? err.message ?? "Something went wrong.";
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Phase = "request" | "reset" | "done";

export default function ForgotPassword() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();

  const [phase, setPhase] = useState<Phase>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");

  const isLoading = fetchStatus === "fetching";
  const isDisabled = isLoading;

  // ── Step 1: Send code ──────────────────────────────────────────────────────

  const handleRequest = useCallback(async () => {
    if (!signIn) return;
    setApiError("");

    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");

    const { error } = await signIn.resetPasswordEmailCode.sendCode();
    if (error) {
      // If no sign-in exists yet, create one first with the identifier
      // The new v4 API requires signIn to have an identifier first
      setApiError(mapClerkError(error));
      return;
    }

    setPhase("reset");
  }, [signIn, email]);

  // ── Step 2: Verify code + set new password ─────────────────────────────────

  const handleReset = useCallback(async () => {
    if (!signIn) return;
    setApiError("");
    let valid = true;

    if (!code.trim() || code.trim().length < 6) {
      setCodeError("Enter the 6-digit code from your email.");
      valid = false;
    } else {
      setCodeError("");
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (!valid) return;

    const { error: verifyError } =
      await signIn.resetPasswordEmailCode.verifyCode({
        code: code.trim(),
      });

    if (verifyError) {
      setApiError(mapClerkError(verifyError));
      return;
    }

    const { error: submitError } =
      await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });

    if (submitError) {
      setApiError(mapClerkError(submitError));
      return;
    }

    if (signIn.status === "complete") {
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) {
        setApiError(mapClerkError(finalizeError));
      } else {
        setPhase("done");
      }
    } else {
      setPhase("done");
    }
  }, [signIn, code, newPassword]);

  // ── Render: Done ───────────────────────────────────────────────────────────

  if (phase === "done") {
    return (
      <SafeAreaView className="auth-safe-area" style={{ flex: 1, backgroundColor: '#fff9e3' }}>
        <View className="auth-content flex-1 items-center justify-center">
          <View className="mb-6 size-20 items-center justify-center rounded-full bg-success/15">
            <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
          </View>
          <Text className="auth-title text-center">Password updated!</Text>
          <Text className="auth-subtitle text-center">
            Your password has been reset successfully.
          </Text>
          <Pressable
            className="auth-button mt-8 w-full"
            onPress={() => router.replace("/(auth)/sign-in")}
          >
            <Text className="auth-button-text">Back to sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Reset form (step 2) ────────────────────────────────────────────

  if (phase === "reset") {
    return (
      <SafeAreaView className="auth-safe-area" style={{ flex: 1, backgroundColor: '#fff9e3' }}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            className="auth-scroll"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="auth-content">
              {/* Back */}
              <Pressable
                onPress={() => setPhase("request")}
                className="mb-2 flex-row items-center gap-1"
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={18} color="#ea7a53" />
                <Text className="auth-link">Back</Text>
              </Pressable>

              <Text className="auth-title mt-4">Set new password</Text>
              <Text className="auth-subtitle">
                Enter the code we sent to{" "}
                <Text className="font-sans-bold text-primary">{email}</Text> and
                choose a new password.
              </Text>

              <View className="auth-card">
                <View className="auth-form">
                  {/* Code */}
                  <View className="auth-field">
                    <Text className="auth-label">Reset code</Text>
                    <TextInput
                      className={`auth-input text-center text-2xl tracking-[12px] ${codeError ? "auth-input-error" : ""}`}
                      placeholder="______"
                      placeholderTextColor="rgba(0,0,0,0.25)"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={code}
                      onChangeText={(t) => {
                        setCode(t.replace(/[^0-9]/g, ""));
                        if (codeError) setCodeError("");
                        if (apiError) setApiError("");
                      }}
                      editable={!isDisabled}
                      textAlign="center"
                    />
                    {!!codeError && (
                      <Text className="auth-error text-center">
                        {codeError}
                      </Text>
                    )}
                  </View>

                  {/* New password */}
                  <View className="auth-field">
                    <Text className="auth-label">New password</Text>
                    <View className="relative">
                      <TextInput
                        className={`auth-input pr-12 ${passwordError ? "auth-input-error" : ""}`}
                        placeholder="Minimum 8 characters"
                        placeholderTextColor="rgba(0,0,0,0.35)"
                        secureTextEntry={!showPassword}
                        textContentType="newPassword"
                        value={newPassword}
                        onChangeText={(t) => {
                          setNewPassword(t);
                          if (passwordError) setPasswordError("");
                        }}
                        editable={!isDisabled}
                      />
                      <Pressable
                        onPress={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-0 bottom-0 justify-center"
                        hitSlop={8}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={20}
                          color="rgba(0,0,0,0.45)"
                        />
                      </Pressable>
                    </View>
                    {!!passwordError && (
                      <Text className="auth-error">{passwordError}</Text>
                    )}
                  </View>

                  {!!apiError && (
                    <View className="rounded-xl bg-destructive/10 px-4 py-3">
                      <Text className="auth-error text-center">{apiError}</Text>
                    </View>
                  )}

                  <Pressable
                    className={`auth-button ${isDisabled ? "auth-button-disabled" : ""}`}
                    onPress={handleReset}
                    disabled={isDisabled}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#081126" />
                    ) : (
                      <Text className="auth-button-text">Reset Password</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Render: Request form (step 1) ──────────────────────────────────────────

  return (
    <SafeAreaView className="auth-safe-area" style={{ flex: 1, backgroundColor: '#fff9e3' }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="auth-scroll"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="auth-content">
            {/* Back */}
            <Pressable
              onPress={() => router.back()}
              className="mb-2 flex-row items-center gap-1"
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={18} color="#ea7a53" />
              <Text className="auth-link">Back to sign in</Text>
            </Pressable>

            <Text className="auth-title mt-4">Reset your password</Text>
            <Text className="auth-subtitle">
              Enter your account email and we&apos;ll send you a reset code.
            </Text>

            <View className="auth-card">
              <View className="auth-form">
                <View className="auth-field">
                  <Text className="auth-label">Email</Text>
                  <TextInput
                    className={`auth-input ${emailError ? "auth-input-error" : ""}`}
                    placeholder="you@example.com"
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (emailError) setEmailError("");
                      if (apiError) setApiError("");
                    }}
                    editable={!isDisabled}
                  />
                  {!!emailError && (
                    <Text className="auth-error">{emailError}</Text>
                  )}
                </View>

                {!!apiError && (
                  <View className="rounded-xl bg-destructive/10 px-4 py-3">
                    <Text className="auth-error text-center">{apiError}</Text>
                  </View>
                )}

                <Pressable
                  className={`auth-button ${isDisabled ? "auth-button-disabled" : ""}`}
                  onPress={handleRequest}
                  disabled={isDisabled}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#081126" />
                  ) : (
                    <Text className="auth-button-text">Send Reset Code</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
