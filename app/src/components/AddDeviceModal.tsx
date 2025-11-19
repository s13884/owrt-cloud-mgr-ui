import React, { useState } from "react";

interface AddDeviceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    mac_address: string;
    description: string;
    location: string;
  }) => void;
}

export default function AddDeviceModal({ open, onClose, onSubmit }: AddDeviceModalProps) {
  const [name, setName] = useState("");
  const [mac, setMac] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-96">
        <h2 className="text-xl font-semibold mb-4">Add Device</h2>

        <div className="flex flex-col gap-3">

          <input
            className="border p-2 rounded"
            placeholder="Device Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="border p-2 rounded"
            placeholder="MAC Address (AA:BB:CC:DD:EE:FF)"
            value={mac}
            onChange={(e) => setMac(e.target.value)}
          />

          <input
            className="border p-2 rounded"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <input
            className="border p-2 rounded"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="flex justify-end mt-6 gap-3">
          <button className="px-3 py-2 bg-gray-300 rounded" onClick={onClose}>
            Cancel
          </button>

          <button
            className="px-3 py-2 bg-blue-600 text-white rounded"
            onClick={() => {
              if (!name.trim()) return alert("Name required");
              if (!mac.trim()) return alert("MAC required");

              onSubmit({
                name,
                mac_address: mac,
                description,
                location,
              });

              setName("");
              setMac("");
              setDescription("");
              setLocation("");
              onClose();
            }}
          >
            Add Device
          </button>
        </div>
      </div>
    </div>
  );
}
