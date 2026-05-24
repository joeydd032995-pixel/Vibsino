import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen casino-bg flex items-center justify-center px-6">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 60%)" }}
        />
      </div>

      <div className="relative z-10 text-center">
        <div
          className="text-[120px] md:text-[180px] font-display font-bold leading-none mb-2"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(217,119,6,0.1))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </div>
        <p className="font-display text-xl text-white mb-2">Page Not Found</p>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          Looks like this page folded. Head back to the lobby and try your luck there.
        </p>
        <Link to="/">
          <Button
            className="gap-2 font-semibold"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0a0a0f" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Casino
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
