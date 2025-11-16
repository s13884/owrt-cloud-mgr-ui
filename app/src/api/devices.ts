// devices.ts
import { apiGet, apiPost, apiDelete } from "./client";

export type Deviceinfo = {
  name: string;
  description?: string;
  location?: string;
};

export type Device = {
  id?: string;
  name: string;
  description?: string;
  location?: string;
  ip?: string;
  status?: string;
};

export async function createDeviceApi(d: Deviceinfo) {
  return apiPost("/api/device/create", d);
}

export async function deleteDeviceApi(name: string) {
  return apiDelete(`/api/device/${encodeURIComponent(name)}/delete`);
}

export async function getDeviceByNameApi(name: string): Promise<Device> {
  return apiGet(`/api/device/${encodeURIComponent(name)}/get`);
}

export async function getAllDevicesApi(): Promise<Device[]> {
  return apiGet("/api/device/get");
}

