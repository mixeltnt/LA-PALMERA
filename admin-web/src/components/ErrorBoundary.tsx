import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: "480px",
              width: "100%",
              padding: "32px 24px",
              textAlign: "center",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              background: "rgba(15, 23, 42, 0.85)",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(244, 63, 94, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
              }}
            >
              <AlertTriangle size={26} color="#fb7185" />
            </div>

            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc", marginBottom: "8px" }}>
              Ocurrió un inconveniente al renderizar
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              {this.state.error?.message || "Error inesperado en la interfaz. Los datos en la nube están protegidos."}
            </p>

            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", margin: "0 auto" }}
            >
              <RefreshCw size={16} />
              <span>Recargar Vista</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
