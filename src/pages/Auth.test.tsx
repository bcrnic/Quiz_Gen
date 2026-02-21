import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Auth from "@/pages/Auth";

const mocks = vi.hoisted(() => {
  return {
    navigateMock: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigateMock,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
    },
  },
}));

const renderAuth = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <Auth />
      </LanguageProvider>
    </MemoryRouter>,
  );

describe("Auth page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.signUp.mockResolvedValue({ error: null });
  });

  it("signs in and navigates to home", async () => {
    renderAuth();

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      });
      expect(mocks.navigateMock).toHaveBeenCalledWith("/");
    });
  });

  it("sends forgot-password email with reset route redirect", async () => {
    renderAuth();

    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    });
  });

  it("signs up with email redirect", async () => {
    renderAuth();

    fireEvent.click(screen.getAllByRole("button", { name: "Sign Up" })[0]);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign Up" })[0]);

    await waitFor(() => {
      expect(mocks.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "secret123",
        options: { emailRedirectTo: window.location.origin },
      });
    });
  });
});
