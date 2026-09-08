import { useSignIn } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";
import { Link, useRouter } from "expo-router";
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
    case "form_password_incorrect":
      return "Incorrect password. Please try again.";
    case "form_identifier_not_found":
      return "No account found with this email.";
    case "too_many_requests":
      return "Too many attempts. Please wait a moment.";
    case "session_exists":
      return "You are already signed in.";
    case "form_code_incorrect":
      return "That code is incorrect. Please try again.";
    case "verification_expired":
      return "The code has expired. Please sign in again.";
    default:
      return err.longMessage ?? err.message ?? "Something went wrong.";
  }
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

type Phase = "credentials" | "otp";

export default function SignIn() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();

  // ── Phase 1 state ─────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ── Phase 2 state ─────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("credentials");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  // ── Shared state ──────────────────────────────────────────────────────────
  const [apiError, setApiError] = useState("");

  const isLoading = fetchStatus === "fetching";
  const isDisabled = isLoading;

  // ── Validation ────────────────────────────────────────────────────────────

  const validateFields = useCallback((): boolean => {
    let valid = true;

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

    return valid;
  }, [email, password]);

  // ── Submit Phase 1 — credentials ─────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    if (!signIn) return;
    setApiError("");
    if (!validateFields()) return;

    const { error } = await signIn.password({
      emailAddress: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setApiError(mapClerkError(error));
      return;
    }

    if (signIn.status === "complete") {
      // No further verification required — finalize and navigate
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError && finalizeError.code !== "session_exists") {
        setApiError(mapClerkError(finalizeError));
        return;
      }
      // session_exists is treated as success (session already active)
      router.replace("/(tabs)" as any);
      return;
    }

    if (signIn.status === "needs_second_factor") {
      const supportsEmailCode = signIn.supportedSecondFactors?.some(
        (factor) => factor.strategy === "email_code",
      );
      if (!supportsEmailCode) {
        setApiError(
          "This account requires a verification method that isn't supported here yet.",
        );
        return;
      }

      // Second-factor email codes are not sent automatically — request one explicitly
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) {
        setApiError(mapClerkError(sendError));
        return;
      }

      setCode("");
      setCodeError("");
      setPhase("otp");
      return;
    }

    setApiError(
      "This account requires a verification method that isn't supported here yet.",
    );
  }, [signIn, email, password, validateFields, router]);

  // ── Submit Phase 2 — email code (second factor) ──────────────────────────

  const handleVerifyCode = useCallback(async () => {
    if (!signIn) return;
    setApiError("");

    if (!code.trim() || code.trim().length < 6) {
      setCodeError("Enter the 6-digit code from your email.");
      return;
    }
    setCodeError("");

    const { error } = await signIn.mfa.verifyEmailCode({
      code: code.trim(),
    });

    if (error) {
      setApiError(mapClerkError(error));
      return;
    }

    // verifyEmailCode succeeded — finalize to activate the session
    const { error: finalizeError } = await signIn.finalize();
    if (finalizeError && finalizeError.code !== "session_exists") {
      // session_exists means session was auto-activated by verifyCode — treat as success
      setApiError(mapClerkError(finalizeError));
      return;
    }
    router.replace("/(tabs)" as any);
  }, [signIn, code, router]);

  // ── Resend code ───────────────────────────────────────────────────────────

  const handleResendCode = useCallback(async () => {
    if (!signIn || isLoading) return;
    setApiError("");
    setCodeError("");
    const { error } = await signIn.mfa.sendEmailCode();
    if (error) setApiError(mapClerkError(error));
  }, [signIn, isLoading]);

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render — Phase 2 (OTP) ────────────────────────────────────────────────

  if (phase === "otp") {
    return (
      <SafeAreaView
        className="auth-safe-area"
        style={{ flex: 1, backgroundColor: "#fff9e3" }}
      >
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
                      className={clsx("auth-input", codeError && "auth-input-error")}
                      style={{ letterSpacing: 12, fontSize: 24, textAlign: "center" }}
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
                    className={clsx(
                      "auth-button",
                      isDisabled && "auth-button-disabled",
                    )}
                    onPress={handleVerifyCode}
                    disabled={isDisabled}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#081126" />
                    ) : (
                      <Text className="auth-button-text">Verify & Sign In</Text>
                    )}
                  </Pressable>

                  {/* Resend */}
                  <Pressable
                    onPress={handleResendCode}
                    disabled={isLoading}
                    className="items-center py-1"
                    hitSlop={8}
                  >
                    <Text className="auth-helper">
                      Didn&apos;t get it? Resend code
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Back to credentials */}
              <View className="auth-link-row">
                <Pressable
                  onPress={() => {
                    setPhase("credentials");
                    setCode("");
                    setCodeError("");
                    setApiError("");
                  }}
                  hitSlop={8}
                >
                  <Text className="auth-link">← Use a different account</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render — Phase 1 (Credentials) ────────────────────────────────────────

  return (
    <SafeAreaView
      className="auth-safe-area"
      style={{ flex: 1, backgroundColor: "#fff9e3" }}
    >
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
            {/* Brand */}
            <BrandHeader />

            {/* Heading */}
            <Text className="auth-title mt-8 text-center">Welcome back</Text>
            <Text className="auth-subtitle max-w-full!">
              Sign in to your account
            </Text>

            {/* Form card */}
            <View className="auth-card">
              <View className="auth-form">
                {/* Email */}
                <View className="auth-field">
                  <Text className="auth-label">Email</Text>
                  <TextInput
                    className={clsx("auth-input", emailError && "auth-input-error")}
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
                      className={clsx("auth-input pr-12", passwordError && "auth-input-error")}
                      placeholder="••••••••"
                      placeholderTextColor="rgba(0,0,0,0.35)"
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      autoComplete="current-password"
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        if (passwordError) setPasswordError("");
                        if (apiError) setApiError("");
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
                  {!!passwordError && (
                    <Text className="auth-error">{passwordError}</Text>
                  )}
                </View>

                {/* Forgot password */}
                <Pressable
                  onPress={() => router.push("/(auth)/forgot-password" as any)}
                  className="self-end"
                  hitSlop={8}
                >
                  <Text className="auth-link text-xs">Forgot password?</Text>
                </Pressable>

                {/* API error */}
                {!!apiError && (
                  <View className="rounded-xl bg-destructive/10 px-4 py-3">
                    <Text className="auth-error text-center">{apiError}</Text>
                  </View>
                )}

                {/* CTA */}
                <Pressable
                  className={clsx(
                    "auth-button",
                    isDisabled && "auth-button-disabled",
                  )}
                  onPress={handleSignIn}
                  disabled={isDisabled}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#081126" />
                  ) : (
                    <Text className="auth-button-text">Continue</Text>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Footer link */}
            <View className="auth-link-row">
              <Text className="auth-link-copy">
                Don&apos;t have an account?
              </Text>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable hitSlop={8}>
                  <Text className="auth-link">Create one</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
