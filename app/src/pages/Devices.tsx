import React, { useEffect, useState } from "react";
import { getAllDevicesApi, deleteDeviceApi, Device } from "../api/devices";
import Layout from "../components/Layout";

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDevices() {
    setLoading(true);
    setError(null);
    try {
      const list = await getAllDevicesApi();
      setDevices(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  async function handleDelete(name: string) {
    if (!confirm(`Delete device "${name}"?`)) return;
    try {
      await deleteDeviceApi(name);
      await loadDevices();
    } catch (err: any) {
      alert("Delete failed: " + (err?.message || "error"));
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Devices</h1>
        <button
          onClick={() => {
            const name = prompt("Device name");
            const desc = prompt("Description") || "";
            const loc = prompt("Location") || "";
            if (!name) return;
            (async () => {
              try {
                await (await import("../api/devices")).createDeviceApi({ name, description: desc, location: loc });
                await loadDevices();
              } catch (e: any) {
                alert("Create failed: " + (e?.message || e));
              }
            })();
          }}
          className="px-3 py-2 bg-blue-600 text-white rounded"
        >
          + Add Device
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="bg-white rounded shadow-sm p-4">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">IP</th>
              <th className="p-2 border">Location</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.name}>
                <td className="p-2 border">{d.name}</td>
                <td className="p-2 border">{d.ip || "-"}</td>
                <td className="p-2 border">{d.location || "-"}</td>
                <td className="p-2 border">{d.status || "-"}</td>
                <td className="p-2 border">
                  <button className="mr-2 text-sm text-red-600" onClick={() => handleDelete(d.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

