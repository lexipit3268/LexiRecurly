import { useSignIn } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
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

export default function SignIn() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
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

  // ── Submit ────────────────────────────────────────────────────────────────

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
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) {
        setApiError(mapClerkError(finalizeError));
      }
    } else {
      setApiError("Additional verification required. Please check your email.");
    }
  }, [signIn, email, password, validateFields]);

  // ── Render ────────────────────────────────────────────────────────────────

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
            <Text className="auth-title mt-8">Welcome back</Text>
            <Text className="auth-subtitle">Sign in to your account</Text>

            {/* Form card */}
            <View className="auth-card">
              <View className="auth-form">
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
                  onPress={() => router.push("/(auth)/forgot-password")}
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
                  className={`auth-button ${isDisabled ? "auth-button-disabled" : ""}`}
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
