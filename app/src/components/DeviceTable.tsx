import { Device } from "../api/devices";

export default function DeviceTable({ devices }: { devices: Device[] }) {
  return (
    <table className="w-full bg-white shadow-sm rounded border-collapse">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2 border">Name</th>
          <th className="p-2 border">IP</th>
          <th className="p-2 border">Status</th>
          <th className="p-2 border">Uptime</th>
        </tr>
      </thead>
      <tbody>
        {devices.map((d) => (
          <tr key={d.id}>
            <td className="p-2 border">{d.name}</td>
            <td className="p-2 border">{d.ip}</td>
            <td className="p-2 border">
              {d.status === "online" ? (
                <span className="text-green-600">Online</span>
              ) : (
                <span className="text-red-600">Offline</span>
              )}
            </td>
            <td className="p-2 border">{d.uptime}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
