import { useEffect, useState } from "react";
import { getDeviceList, Device } from "../api/devices";
import DeviceTable from "../components/DeviceTable";
import Layout from "../components/Layout";

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    getDeviceList().then(setDevices);
  }, []);

  return (
    <Layout>
      <h1 className="text-xl font-semibold mb-4">Devices</h1>
      <DeviceTable devices={devices} />
    </Layout>
  );
}
