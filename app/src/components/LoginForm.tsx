import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await auth.login({ login, password });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto mt-20">
      <h2 className="text-2xl font-semibold text-center">OpenWRT Login</h2>
      {error && <p className="text-red-600">{error}</p>}
      <input
        className="border w-full px-3 py-2 rounded"
        placeholder="Username"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
      />
      <input
        type="password"
        className="border w-full px-3 py-2 rounded"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}



// import { useState } from "react";
// import { login as apiLogin } from "../api/auth";
// import { useAuth } from "../context/AuthContext";
// import { useNavigate } from "react-router-dom";

// export default function LoginForm() {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const auth = useAuth();
//   const navigate = useNavigate();

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       const result: any = await apiLogin(username, password);
//       auth.login(result.token, result.user);
//       navigate("/dashboard");
//     } catch (err: any) {
//       setError(err.message);
//     }

//     setLoading(false);
//   }

//   return (
//     <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto mt-20">
//       <h2 className="text-2xl font-semibold text-center">OpenWRT Login</h2>

//       {error && <p className="text-red-600">{error}</p>}

//       <input
//         className="border w-full px-3 py-2 rounded"
//         placeholder="Username"
//         value={username}
//         onChange={(e) => setUsername(e.target.value)}
//       />

//       <input
//         type="password"
//         className="border w-full px-3 py-2 rounded"
//         placeholder="Password"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//       />

//       <button
//         disabled={loading}
//         className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
//       >
//         {loading ? "Logging in..." : "Login"}
//       </button>
//     </form>
//   );
// }
