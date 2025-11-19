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

