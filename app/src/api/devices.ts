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
  uptime?: string;
  status?: string;
};

export async function createDeviceApi(data: {
  name: string;
  description: string;
  location: string;
  mac_address?: string;
}) {
  return apiPost("/api/device/create", data);
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

// export async function createDeviceConfigApi(deviceName: string, config: any) {
//   // backend endpoint for creating/storing config version
//   return apiPost(`/api/device/${encodeURIComponent(deviceName)}/config/create`, config);
// }

export async function getPortalProfilesApi() {
  // optional: fetch list of portal profiles from backend (for future cloud portal)
  return apiGet("/api/portal/profiles");
}

// export async function fetchDeviceConfigApi(mac: string) {
//   return apiGet(`/api/config/${mac}/latest`);
// }


export async function createDeviceConfigApi(mac: string, config: any) {
  return apiPost(`/api/config/${mac}/create`, config);
}

export async function getLatestConfigApi(mac: string) {
  return apiGet(`/api/config/${mac}/latest`);
}

export async function getAllConfigsApi(mac: string) {
  return apiGet(`/api/config/${mac}/all`);
}

