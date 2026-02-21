import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import History from "@/pages/History";

const mocks = vi.hoisted(() => {
  return {
    useAuthMock: vi.fn(),
    toastError: vi.fn(),
    orderMock: vi.fn(),
    eqMock: vi.fn(),
    neqMock: vi.fn(),
    selectMock: vi.fn(),
    deleteMock: vi.fn(),
    fromMock: vi.fn(),
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mocks.useAuthMock(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
  },
}));

vi.mock("recharts", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const noop = () => null;
  return {
    ResponsiveContainer: passthrough,
    AreaChart: noop,
    Area: noop,
    XAxis: noop,
    YAxis: noop,
    Tooltip: noop,
    CartesianGrid: noop,
  };
});

vi.mock("@/components/StreakBadge", () => ({
  default: () => <div>streak-badge</div>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (...args: unknown[]) => mocks.fromMock(...args),
  },
}));

const renderHistory = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <History />
      </LanguageProvider>
    </MemoryRouter>,
  );

const sampleResults = [
  {
    id: "r1",
    created_at: "2026-02-20T10:00:00.000Z",
    file_name: "biology-notes.pdf",
    total_questions: 10,
    correct_answers: 8,
    score: 80,
  },
  {
    id: "r2",
    created_at: "2026-02-21T10:00:00.000Z",
    file_name: "history.txt",
    total_questions: 10,
    correct_answers: 6,
    score: 60,
  },
];

describe("History page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useAuthMock.mockReturnValue({
      user: { id: "user-1" },
      loading: false,
    });

    mocks.orderMock.mockResolvedValue({ data: sampleResults, error: null });
    mocks.selectMock.mockReturnValue({ order: mocks.orderMock });
    mocks.eqMock.mockResolvedValue({ error: null });
    mocks.neqMock.mockResolvedValue({ error: null });
    mocks.deleteMock.mockReturnValue({ eq: mocks.eqMock, neq: mocks.neqMock });
    mocks.fromMock.mockReturnValue({
      select: mocks.selectMock,
      delete: mocks.deleteMock,
    });
  });

  it("loads and shows quiz history entries", async () => {
    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("biology-notes.pdf")).toBeInTheDocument();
      expect(screen.getByText("history.txt")).toBeInTheDocument();
    });

    expect(mocks.fromMock).toHaveBeenCalledWith("quiz_results");
    expect(screen.getByText("streak-badge")).toBeInTheDocument();
  });

  it("shows empty state when there are no results", async () => {
    mocks.orderMock.mockResolvedValue({ data: [], error: null });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("No quizzes yet")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Take a Quiz" })).toBeInTheDocument();
    });
  });

  it("deletes a single result row", async () => {
    renderHistory();

    await screen.findByText("biology-notes.pdf");
    const deleteButtons = screen.getAllByRole("button");
    fireEvent.click(deleteButtons[1]);

    await waitFor(() => {
      expect(mocks.eqMock).toHaveBeenCalledWith("id", "r1");
      expect(screen.queryByText("biology-notes.pdf")).not.toBeInTheDocument();
    });
  });

  it("clears all history after confirmation", async () => {
    renderHistory();

    await screen.findByText("biology-notes.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete all" }));

    await waitFor(() => {
      expect(mocks.neqMock).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
      expect(screen.queryByText("biology-notes.pdf")).not.toBeInTheDocument();
      expect(screen.queryByText("history.txt")).not.toBeInTheDocument();
    });
  });
});
