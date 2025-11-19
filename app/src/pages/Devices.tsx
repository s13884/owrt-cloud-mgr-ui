import React, { useEffect, useState } from "react";
import {
  createDeviceApi,
  getAllDevicesApi,
  deleteDeviceApi,
  getLatestConfigApi,
  createDeviceConfigApi,
} from "../api/devices";

import AddDeviceModal from "../components/AddDeviceModal";
import AddDeviceConfigModal from "../components/AddDeviceConfigModal";
import Layout from "../components/Layout";

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);

  // CONFIG MODAL
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [initialConfig, setInitialConfig] = useState<any | null>(null);

  // Toast message
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  // ---------------------------
  // Load all devices
  // ---------------------------
  async function loadDevices() {
    setLoading(true);
    setError(null);
    try {
      const list = await getAllDevicesApi();
      setDevices(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  // ---------------------------
  // OPEN CONFIG MODAL
  // ---------------------------
  async function handleOpenConfig(device: any) {
    console.log("CONFIGURE DEVICE:", device.mac_address);

    setSelectedDevice(device);
    setShowConfigModal(true);
    setInitialConfig(null); // clear previous

    try {
      const cfg = await getLatestConfigApi(device.mac_address);
      console.log("Fetched config:", cfg);
      setInitialConfig(cfg);
    } catch (err) {
      console.log("No config found for device");
      setInitialConfig(null);
    }
  }

  // ---------------------------
  // HANDLE CONFIG SAVE
  // ---------------------------
  async function handleSubmitConfig(uciJson: any) {
    if (!selectedDevice) return;

    console.log(selectedDevice.mac_address);

    try {
      await createDeviceConfigApi(selectedDevice.mac_address, uciJson);
      setMessage({ type: "success", text: "Configuration saved & queued." });
      setShowConfigModal(false);
      await loadDevices();
    } catch (e: any) {
      setMessage({
        type: "error",
        text: "Failed to save config: " + (e?.message || String(e)),
      });
    }
  }

  // ---------------------------
  // HANDLE DEVICE DELETE
  // ---------------------------
  async function handleDelete(name: string) {
    if (!window.confirm("Delete this device?")) return;

    try {
      await deleteDeviceApi(name);
      setMessage({ type: "success", text: "Device deleted successfully." });
      loadDevices();
    } catch (e: any) {
      setMessage({ type: "error", text: "Delete failed: " + e.message });
    }
  }

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <Layout>
      <div className="p-4">

        {/* TOAST */}
        {message && (
          <div
            className={`p-3 mb-4 rounded ${
              message.type === "success"
                ? "bg-green-200 text-green-800"
                : "bg-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Devices</h1>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded"
          >
            + Add Device
          </button>
        </div>

        {/* STATUS */}
        {loading && <p>Loading devices...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {/* TABLE */}
        <div className="bg-white rounded shadow-sm p-4">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">MAC</th>
                <th className="p-2 border">Description</th>
                <th className="p-2 border">Location</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>

            <tbody>
              {devices.map((d) => (
                <tr key={d.mac_address}>
                  <td className="p-2 border">{d.name}</td>
                  <td className="p-2 border">{d.mac_address}</td>
                  <td className="p-2 border">{d.description}</td>
                  <td className="p-2 border">{d.location}</td>

                  <td className="p-2 border">
                    <button
                      className="mr-3 text-sm text-red-600"
                      onClick={() => handleDelete(d.name)}
                    >
                      Delete
                    </button>

                    <button
                      className="text-sm text-purple-600"
                      onClick={() => handleOpenConfig(d)}
                    >
                      🛠 Configure
                    </button>
                  </td>
                </tr>
              ))}

              {!devices.length && !loading && (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-gray-500">
                    No devices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ADD DEVICE MODAL */}
        {showAddModal && (
          <AddDeviceModal
            open={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSubmit={async (data) => {
              try {
                await createDeviceApi(data);     // <-- you MUST have this method
                await loadDevices();
              } catch (e: any) {
                alert("Failed: " + (e?.message || e));
              }
            }}
          />
        )}

        {/* CONFIG MODAL */}
        {showConfigModal && selectedDevice && (
          <AddDeviceConfigModal
            open={showConfigModal}
            deviceName={selectedDevice.name}
            mac={selectedDevice.mac_address}
            initialConfig={initialConfig}
            onClose={() => setShowConfigModal(false)}
            onSave={handleSubmitConfig}
          />
        )}
      </div>
    </Layout>
  );
}
