export type Device = {
  id: string;
  name: string;
  ip: string;
  status: "online" | "offline";
  uptime: string;
};

export async function getDeviceList(): Promise<Device[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: "1", name: "GL-AR750", ip: "192.168.8.1", status: "online", uptime: "5h 21m" },
        { id: "2", name: "TPLink MR3020", ip: "192.168.0.1", status: "offline", uptime: "-" },
        { id: "3", name: "MT300N V2", ip: "192.168.1.1", status: "online", uptime: "12h 09m" }
      ]);
    }, 500);
  });
}
