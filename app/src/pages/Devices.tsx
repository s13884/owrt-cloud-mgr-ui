import React, { useEffect, useState } from "react";
import { getAllDevicesApi, deleteDeviceApi, createDeviceConfigApi } from "../api/devices";
import AddDeviceConfigModal from "../components/AddDeviceConfigModal";

export default function DeviceTable() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  // toast message
  const [message, setMessage] = useState<{type:'success'|'error', text:string} | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(()=>setMessage(null), 4000);
    return ()=>clearTimeout(t);
  }, [message]);

  async function loadDevices() {
    setLoading(true); setError(null);
    try {
      const list = await getAllDevicesApi();
      setDevices(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load devices");
    } finally { setLoading(false); }
  }

  useEffect(()=>{ loadDevices(); }, []);

  async function handleOpenConfig(deviceName: string) {
    setSelectedDevice(deviceName);
    setShowModal(true);
  }

  async function handleSubmitConfig(uciJson: any) {
    if (!selectedDevice) return;
    try {
      await createDeviceConfigApi(selectedDevice, uciJson);
      setMessage({ type: 'success', text: 'Configuration saved and queued for device.' });
      setShowModal(false);
      await loadDevices();
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Create failed: ' + (e?.message || String(e)) });
    }
  }

  return (
    <div className="p-4">
      {message && (
        <div className={`p-3 mb-4 rounded ${message.type === 'success' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Devices</h1>
      </div>

      {loading && <p>Loading devices...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="bg-white rounded shadow-sm p-4">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Description</th>
              <th className="p-2 border">Location</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>

          <tbody>
            {devices.map((d) => (
              <tr key={d.name}>
                <td className="p-2 border">{d.name}</td>
                <td className="p-2 border">{d.description}</td>
                <td className="p-2 border">{d.location}</td>
                <td className="p-2 border">
                  <button className="mr-2 text-sm text-red-600" onClick={() => {/* delete logic */}}>Delete</button>

                  <button className="text-sm text-purple-600" onClick={() => handleOpenConfig(d.name)} title="Configure Device">
                    🛠 Configure
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddDeviceConfigModal
        open={showModal}
        onClose={() => setShowModal(false)}
        deviceName={selectedDevice || ""}
        onSubmit={handleSubmitConfig}
      />
    </div>
  );
}
