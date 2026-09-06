import { useSignUp } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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

// ─── Constants ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_S = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClerkError {
  code: string;
  message: string;
  longMessage?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapClerkError(err: ClerkError | null): string {
  if (!err) return "Something went wrong. Please try again.";
  switch (err.code) {
    case "form_identifier_exists":
      return "An account with this email already exists.";
    case "form_password_pwned":
      return "This password was found in a data breach. Choose a different one.";
    case "form_password_length_too_short":
      return "Password must be at least 8 characters.";
    case "form_code_incorrect":
      return "That code is incorrect. Please double-check and try again.";
    case "verification_expired":
      return "The verification code has expired. Request a new one.";
    case "too_many_requests":
      return "Too many attempts. Please wait a moment.";
    default:
      return err.longMessage ?? err.message ?? "Something went wrong.";
  }
}

function passwordStrength(pw: string): { label: string; color: string } {
  if (pw.length === 0) return { label: "", color: "transparent" };
  if (pw.length < 8) return { label: "Too short", color: "#dc2626" };
  const has = (re: RegExp) => re.test(pw);
  const score =
    [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(has).length;
  if (score <= 2) return { label: "Weak", color: "#f97316" };
  if (score === 3) return { label: "Good", color: "#eab308" };
  return { label: "Strong", color: "#16a34a" };
}

// ─── Brand Header ─────────────────────────────────────────────────────────────

function BrandHeader() {
  return (
    <View className="auth-brand-block">
      <View className="auth-logo-wrap">
        <View className="auth-logo-mark">
          <Text className="auth-logo-mark-text">L</Text>
        </View>
        <View>
          <Text className="auth-wordmark">LexiRecurly</Text>
          <Text className="auth-wordmark-sub">Subscription Manager</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Phase = "register" | "verify";

export default function SignUp() {
  const { signUp, fetchStatus } = useSignUp();

  // ── Phase 1 — Registration ────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── Phase 2 — Verification ────────────────────────────────────────────────
  const [code, setCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Shared state ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("register");
  const [firstNameError, setFirstNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [apiError, setApiError] = useState("");

  const strength = passwordStrength(password);
  const isLoading = fetchStatus === "fetching";
  const isDisabled = isLoading;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, []);

  // ── Validation — Phase 1 ─────────────────────────────────────────────────

  const validateRegistration = useCallback((): boolean => {
    let valid = true;

    if (!firstName.trim()) {
      setFirstNameError("First name is required.");
      valid = false;
    } else {
      setFirstNameError("");
    }

    if (!email.trim()) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!EMAIL_RE.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password.");
      valid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError("Passwords do not match.");
      valid = false;
    } else {
      setConfirmPasswordError("");
    }

    return valid;
  }, [firstName, email, password, confirmPassword]);

  // ── Resend cooldown ───────────────────────────────────────────────────────

  const startResendCountdown = useCallback(() => {
    setResendCountdown(RESEND_COOLDOWN_S);
    resendTimerRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Submit — Phase 1 ─────────────────────────────────────────────────────

  const handleRegister = useCallback(async () => {
    if (!signUp) return;
    setApiError("");
    if (!validateRegistration()) return;

    const { error } = await signUp.password({
      emailAddress: email.trim().toLowerCase(),
      password,
      firstName: firstName.trim(),
    });

    if (error) {
      setApiError(mapClerkError(error));
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) {
      setApiError(mapClerkError(sendError));
      return;
    }

    startResendCountdown();
    setPhase("verify");
  }, [signUp, firstName, email, password, validateRegistration, startResendCountdown]);

  // ── Submit — Phase 2 ─────────────────────────────────────────────────────

  const handleVerify = useCallback(async () => {
    if (!signUp) return;
    setApiError("");

    if (!code.trim() || code.trim().length < 6) {
      setCodeError("Enter the 6-digit code from your email.");
      return;
    }
    setCodeError("");

    const { error } = await signUp.verifications.verifyEmailCode({
      code: code.trim(),
    });

    if (error) {
      setApiError(mapClerkError(error));
      return;
    }

    if (signUp.status === "complete") {
      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) {
        setApiError(mapClerkError(finalizeError));
      }
    } else {
      setApiError(
        "Verification incomplete. Please check your email and try again.",
      );
    }
  }, [signUp, code]);

  // ── Resend code ───────────────────────────────────────────────────────────

  const handleResend = useCallback(async () => {
    if (!signUp || resendCountdown > 0 || isLoading) return;
    setApiError("");
    setCodeError("");

    const { error } = await signUp.verifications.sendEmailCode();
    if (error) {
      setApiError(mapClerkError(error));
      return;
    }

    startResendCountdown();
  }, [signUp, resendCountdown, isLoading, startResendCountdown]);

  // ── Render — Phase 2 (Verify) ─────────────────────────────────────────────

  if (phase === "verify") {
    return (
      <SafeAreaView className="auth-safe-area" style={{ flex: 1, backgroundColor: '#fff9e3' }}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            className="auth-scroll"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="auth-content">
              <BrandHeader />

              <Text className="auth-title mt-8">Check your inbox</Text>
              <Text className="auth-subtitle">
                We sent a 6-digit code to{" "}
                <Text className="font-sans-bold text-primary">{email}</Text>
              </Text>

              <View className="auth-card">
                <View className="auth-form">
                  {/* Code input */}
                  <View className="auth-field">
                    <Text className="auth-label">Verification code</Text>
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
                      <Text className="auth-error text-center">{codeError}</Text>
                    )}
                  </View>

                  {/* API error */}
                  {!!apiError && (
                    <View className="rounded-xl bg-destructive/10 px-4 py-3">
                      <Text className="auth-error text-center">{apiError}</Text>
                    </View>
                  )}

                  {/* CTA */}
                  <Pressable
                    className={`auth-button ${isDisabled ? "auth-button-disabled" : ""}`}
                    onPress={handleVerify}
                    disabled={isDisabled}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#081126" />
                    ) : (
                      <Text className="auth-button-text">Verify Email</Text>
                    )}
                  </Pressable>

                  {/* Resend */}
                  <Pressable
                    onPress={handleResend}
                    disabled={resendCountdown > 0 || isLoading}
                    className="items-center py-1"
                    hitSlop={8}
                  >
                    <Text
                      className={`auth-helper ${resendCountdown > 0 ? "opacity-40" : ""}`}
                    >
                      {resendCountdown > 0
                        ? `Resend code in ${resendCountdown}s`
                        : "Didn't get it? Resend code"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Back to register */}
              <View className="auth-link-row">
                <Pressable
                  onPress={async () => {
                    if (signUp) await signUp.reset();
                    setPhase("register");
                    setCode("");
                    setCodeError("");
                    setApiError("");
                  }}
                  hitSlop={8}
                >
                  <Text className="auth-link">← Use a different email</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Render — Phase 1 (Register) ───────────────────────────────────────────

  return (
    <SafeAreaView className="auth-safe-area" style={{ flex: 1, backgroundColor: '#fff9e3' }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          className="auth-scroll"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="auth-content">
            <BrandHeader />

            <Text className="auth-title mt-8">Create your account</Text>
            <Text className="auth-subtitle">
              Track every subscription, effortlessly
            </Text>

            <View className="auth-card">
              <View className="auth-form">
                {/* First name */}
                <View className="auth-field">
                  <Text className="auth-label">First name</Text>
                  <TextInput
                    className={`auth-input ${firstNameError ? "auth-input-error" : ""}`}
                    placeholder="Your first name"
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    autoCapitalize="words"
                    autoCorrect={false}
                    textContentType="givenName"
                    autoComplete="given-name"
                    value={firstName}
                    onChangeText={(t) => {
                      setFirstName(t);
                      if (firstNameError) setFirstNameError("");
                    }}
                    editable={!isDisabled}
                  />
                  {!!firstNameError && (
                    <Text className="auth-error">{firstNameError}</Text>
                  )}
                </View>

                {/* Email */}
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

                {/* Password */}
                <View className="auth-field">
                  <Text className="auth-label">Password</Text>
                  <View className="relative">
                    <TextInput
                      className={`auth-input pr-12 ${passwordError ? "auth-input-error" : ""}`}
                      placeholder="Minimum 8 characters"
                      placeholderTextColor="rgba(0,0,0,0.35)"
                      secureTextEntry={!showPassword}
                      textContentType="newPassword"
                      autoComplete="new-password"
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
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
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="rgba(0,0,0,0.45)"
                      />
                    </Pressable>
                  </View>
                  {/* Strength meter */}
                  {password.length > 0 && (
                    <View className="flex-row items-center gap-2">
                      <View className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                        <View
                          style={{
                            flex:
                              strength.label === "Too short"
                                ? 0.25
                                : strength.label === "Weak"
                                  ? 0.5
                                  : strength.label === "Good"
                                    ? 0.75
                                    : 1,
                            backgroundColor: strength.color,
                            height: "100%",
                            borderRadius: 99,
                          }}
                        />
                      </View>
                      <Text
                        className="text-xs font-sans-semibold"
                        style={{ color: strength.color }}
                      >
                        {strength.label}
                      </Text>
                    </View>
                  )}
                  {!!passwordError && (
                    <Text className="auth-error">{passwordError}</Text>
                  )}
                </View>

                {/* Confirm password */}
                <View className="auth-field">
                  <Text className="auth-label">Confirm password</Text>
                  <View className="relative">
                    <TextInput
                      className={`auth-input pr-12 ${confirmPasswordError ? "auth-input-error" : ""}`}
                      placeholder="Re-enter your password"
                      placeholderTextColor="rgba(0,0,0,0.35)"
                      secureTextEntry={!showConfirmPassword}
                      textContentType="newPassword"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChangeText={(t) => {
                        setConfirmPassword(t);
                        if (confirmPasswordError) setConfirmPasswordError("");
                      }}
                      editable={!isDisabled}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-4 top-0 bottom-0 justify-center"
                      hitSlop={8}
                    >
                      <Ionicons
                        name={
                          showConfirmPassword
                            ? "eye-off-outline"
                            : "eye-outline"
                        }
                        size={20}
                        color="rgba(0,0,0,0.45)"
                      />
                    </Pressable>
                  </View>
                  {!!confirmPasswordError && (
                    <Text className="auth-error">{confirmPasswordError}</Text>
                  )}
                </View>

                {/* API error */}
                {!!apiError && (
                  <View className="rounded-xl bg-destructive/10 px-4 py-3">
                    <Text className="auth-error text-center">{apiError}</Text>
                  </View>
                )}

                {/* CTA */}
                <Pressable
                  className={`auth-button ${isDisabled ? "auth-button-disabled" : ""}`}
                  onPress={handleRegister}
                  disabled={isDisabled}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#081126" />
                  ) : (
                    <Text className="auth-button-text">Get Started</Text>
                  )}
                </Pressable>

                {/* Clerk CAPTCHA anchor (required for Expo Web) */}
                <View nativeID="clerk-captcha" />
              </View>
            </View>

            {/* Footer link */}
            <View className="auth-link-row">
              <Text className="auth-link-copy">Already have an account?</Text>
              <Link href="/(auth)/sign-in" asChild>
                <Pressable hitSlop={8}>
                  <Text className="auth-link">Sign in</Text>
                </Pressable>
              </Link>
            </View>

            {/* Terms micro-copy */}
            <Text className="mt-4 px-4 text-center text-[11px] font-sans-medium text-muted-foreground">
              By creating an account you agree to our{" "}
              <Text className="font-sans-semibold text-primary">
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text className="font-sans-semibold text-primary">
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
