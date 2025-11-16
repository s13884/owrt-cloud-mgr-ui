import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-white border-r shadow-sm p-4">
        <h2 className="font-semibold mb-4">OpenWRT Cloud</h2>

        <nav className="space-y-2">
          <Link className="block hover:text-blue-600" to="/dashboard">Dashboard</Link>
          <Link className="block hover:text-blue-600" to="/devices">Devices</Link>
        </nav>

        <button
          onClick={auth.logout}
          className="mt-6 text-red-600 text-sm"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
}
