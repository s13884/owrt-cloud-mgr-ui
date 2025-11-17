// auth.ts
import { apiPost } from "./client";

export type LoginRequest = {
  login: string;
  password: string;
};

export type LoginResponse = {
  token?: string; // optional if server returns token
  user?: any;
};

export async function loginApi(payload: LoginRequest): Promise<LoginResponse> {
  return apiPost("/admin/login", payload);
}

export type ChangePasswordRequest = {
  oldPassword: string;
  newPassword: string;
};

export async function changePasswordApi(payload: ChangePasswordRequest) {
  return apiPost("/admin/password", payload);
}


// export async function login(username: string, password: string) {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       if (username === "admin" && password === "admin") {
//         resolve({
//           token: "mock-token-123",
//           user: { name: "Admin" }
//         });
//       } else {
//         reject(new Error("Invalid username or password"));
//       }
//     }, 700);
//   });
// }
