import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ResetPassword from "@/pages/ResetPassword";

const mocks = vi.hoisted(() => {
  return {
    navigateMock: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    onAuthStateChange: vi.fn(),
    updateUser: vi.fn(),
    unsubscribe: vi.fn(),
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
      onAuthStateChange: mocks.onAuthStateChange,
      updateUser: mocks.updateUser,
    },
  },
}));

const renderResetPassword = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <ResetPassword />
      </LanguageProvider>
    </MemoryRouter>,
  );

describe("ResetPassword page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mocks.unsubscribe } },
    });
    mocks.updateUser.mockResolvedValue({ error: null });
  });

  it("shows invalid state when recovery token is missing", () => {
    renderResetPassword();
    expect(screen.getByText("Invalid or expired reset link.")).toBeInTheDocument();
  });

  it("updates password when recovery hash is present", async () => {
    window.location.hash = "#type=recovery";
    renderResetPassword();

    fireEvent.change(screen.getByPlaceholderText("New password"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({ password: "secret123" });
      expect(mocks.navigateMock).toHaveBeenCalledWith("/");
    });
  });

  it("rejects mismatched passwords before API call", async () => {
    window.location.hash = "#type=recovery";
    renderResetPassword();

    fireEvent.change(screen.getByPlaceholderText("New password"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), { target: { value: "different123" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Passwords don't match");
    });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
