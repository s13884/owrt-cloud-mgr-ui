import React, { useEffect, useState } from "react";

type NetworkMode = "lan" | "guest" | "hotspot" | "corp";
type AuthMode = "wpa-personal" | "wpa-enterprise" | "hotspot";

type WifiInterface = {
  id: string; // e.g. ap0_unique
  device: string; // radio name like radio0
  ssid: string;
  authMode: AuthMode;
  networkMode: NetworkMode;
  encryption?: string;
  key?: string;
  // WPA-Enterprise fields
  radiusServer?: string;
  radiusPort?: string;
  radiusSecret?: string;
  // Hotspot third-party portal fields
  uamServer?: string;
  radiusServerHotspot?: string;
  radiusPortHotspot?: string;
  radiusSecretHotspot?: string;
  uamAllowed?: string;
  nasId?: string;
  maxassoc?: string;
};

export default function AddDeviceConfigModal({
  open,
  onClose,
  onSubmit,
  deviceName,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (uciJson: any) => Promise<void> | void;
  deviceName: string;
}) {
  const [hostname, setHostname] = useState("");
  const [timezone, setTimezone] = useState("");
  const [tzOffset, setTzOffset] = useState("");
  const [ntpEnabled, setNtpEnabled] = useState(true);
  const [ntpServers, setNtpServers] = useState(["0.pool.ntp.org", "1.pool.ntp.org"]);

  const [logSize, setLogSize] = useState("64k");
  const [logRemote, setLogRemote] = useState(false);
  const [logHost, setLogHost] = useState("");
  const [logIp, setLogIp] = useState("");
  const [logPort, setLogPort] = useState("");
  const [logProto, setLogProto] = useState("udp");

  // radios static for MVP (radio0 and radio1)
  const radiosAvailable = ["radio0", "radio1"];

  // local counter to generate unique section names
  const [ifaceCounter, setIfaceCounter] = useState(0);
    function genIfaceId(counter: number) {
        return `ap${counter}_${Date.now().toString().slice(-4)}`;
    }

// const [ifaceCounter, setIfaceCounter] = useState(0);

const [interfaces, setInterfaces] = useState<WifiInterface[]>(() => {
  return [
    {
      id: genIfaceId(0),
      device: "radio0",
      ssid: "",
      authMode: "wpa-personal",
      networkMode: "lan",
      encryption: "psk2",
      key: "",
      maxassoc: "32",
    }
  ];
});

  useEffect(() => {
    if (open) {
      // reset small form or keep previous values? keep hostname prefilled from deviceName
      setHostname(deviceName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function addInterface() {
    setInterfaces((arr) => [
    ...arr,
    {
      id: genIfaceId(ifaceCounter + 1),
      device: "radio0",
      ssid: "",
      authMode: "wpa-personal",
      networkMode: "guest",
      encryption: "psk2",
      key: "",
      maxassoc: "32",
    },
  ]);

  setIfaceCounter((c) => c + 1);
  }

  function updateIface(id: string, patch: Partial<WifiInterface>) {
    setInterfaces((arr) => arr.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeIface(id: string) {
    setInterfaces((arr) => arr.filter((i) => i.id !== id));
  }

  // Build UCI JSON that maps to ubus uci set format
  function buildUciJson() {
    const system: any[] = [];
    if (hostname || timezone || tzOffset || ntpServers.length) {
      system.push({
        config: "system",
        section: "@system[0]",
        values: {
          ...(hostname ? { hostname } : {}),
          ...(timezone ? { timezone } : {}),
          ...(tzOffset ? { tz_offset: tzOffset } : {}),
          ntp: ntpEnabled ? { servers: ntpServers } : undefined,
        },
      });
    }

    const wireless: any[] = [];
    const network: any[] = [];
    const firewall: any[] = [];
    const chilli: any[] = [];

    // Optionally include radio-level settings (basic) - here we add radio configs only if changed
    radiosAvailable.forEach((r) => {
      // For now we do not modify radio defaults unless needed; you can extend this
    });

    // For each interface create wifi-iface, and network / firewall / chilli if needed
    interfaces.forEach((iface, idx) => {
      // wifi-iface
      const wifiValues: any = {
        device: iface.device,
        mode: "ap",
        ssid: iface.ssid || `ssid_${iface.id}`,
        network: (() => {
          if (iface.networkMode === "lan") return "lan";
          if (iface.networkMode === "guest") return `guest${idx}`;
          if (iface.networkMode === "hotspot") return `hs${idx}`;
          if (iface.networkMode === "corp") return `corp${idx}`;
          return "lan";
        })(),
      };

      // auth specifics
      if (iface.authMode === "wpa-personal") {
        if (iface.encryption) wifiValues.encryption = iface.encryption;
        if (iface.key) wifiValues.key = iface.key;
        if (iface.maxassoc) wifiValues.maxassoc = iface.maxassoc;
      } else if (iface.authMode === "wpa-enterprise") {
        wifiValues.encryption = "wpa2";
        wifiValues.ieee8021x = "1";
        if (iface.radiusServer) wifiValues.auth_server = iface.radiusServer;
        if (iface.radiusPort) wifiValues.auth_port = iface.radiusPort;
        if (iface.radiusSecret) wifiValues.auth_secret = iface.radiusSecret;
      } else if (iface.authMode === "hotspot") {
        // hotspot requires open wifi and network pointing to hsN
        wifiValues.encryption = "none";
      }

      wireless.push({
        config: "wireless",
        section: iface.id,
        type: "wifi-iface",
        values: wifiValues,
      });

      // If network is not 'lan' we need to create network + firewall + forwarding (+ chilli for hotspot)
      const netName =
        iface.networkMode === "lan"
          ? "lan"
          : iface.networkMode === "guest"
          ? `guest${idx}`
          : iface.networkMode === "hotspot"
          ? `hs${idx}`
          : `corp${idx}`;

      if (iface.networkMode !== "lan") {
        // network interface
        network.push({
          config: "network",
          section: netName,
          type: "interface",
          values: {
            proto: "none",
            type: iface.networkMode === "hotspot" ? undefined : "bridge",
            // if hotspot we leave proto none
          },
        });

        // firewall zone
        const zoneName = `${netName}_zone`;
        firewall.push({
          config: "firewall",
          section: `${zoneName}_zone`,
          type: "zone",
          values: {
            name: netName,
            network: netName,
            input: iface.networkMode === "hotspot" ? "ACCEPT" : "REJECT",
            output: "ACCEPT",
            forward: "REJECT",
            masq: iface.networkMode === "hotspot" || iface.networkMode === "guest" ? "1" : "0",
          },
        });

        // forwarding to wan
        firewall.push({
          config: "firewall",
          section: `${netName}_to_wan`,
          type: "forwarding",
          values: {
            src: netName,
            dest: "wan",
          },
        });
      }

      // Hotspot chilli config (third-party portal mode)
      if (iface.networkMode === "hotspot") {
        const chilliSection = `chilli${idx}`;
        chilli.push({
          config: "chilli",
          section: chilliSection,
          type: "chilli",
          values: {
            network: netName,
            uamserver: iface.uamServer || "",
            radiusserver1: iface.radiusServerHotspot || "",
            radiusport1: iface.radiusPortHotspot || "",
            radiussecret: iface.radiusSecretHotspot || "",
            nasid: iface.nasId || `${deviceName}-${netName}`,
            uamallowed: iface.uamAllowed || "",
          },
        });
      }
    });

    // Logs config (optional)
    const logs: any[] = [];
    logs.push({
      config: "system",
      section: "@system[0]",
      values: {
        logs: {
          size: logSize,
          remote_enabled: logRemote ? "1" : "0",
          host: logHost,
          ip: logIp,
          port: logPort,
          proto: logProto,
        },
      },
    });

    const uciJson: any = {
      system: [...system, ...logs],
      wireless,
      network,
      firewall,
      chilli,
    };

    return uciJson;
  }

  async function handleSave() {
    try {
      const uciJson = buildUciJson();
      // pass to parent handler
      await onSubmit(uciJson);
    } catch (err: any) {
      alert("Failed to build config: " + (err?.message || err));
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Configure {deviceName}</h3>
          <button className="text-gray-500" onClick={onClose}>Close</button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
          {/* System */}
          <div>
            <h4 className="font-medium">System</h4>
            <input className="border p-2 w-full rounded mt-2" value={hostname} onChange={(e)=>setHostname(e.target.value)} placeholder="Hostname" />
            <div className="flex gap-2 mt-2">
              <input className="border p-2 rounded w-1/2" value={timezone} onChange={(e)=>setTimezone(e.target.value)} placeholder="Timezone (e.g. UTC)" />
              <input className="border p-2 rounded w-1/2" value={tzOffset} onChange={(e)=>setTzOffset(e.target.value)} placeholder="TZ Offset" />
            </div>

            <div className="mt-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={ntpEnabled} onChange={(e)=>setNtpEnabled(e.target.checked)} /> Enable NTP
              </label>
              {ntpServers.map((s, i) => (
                <input key={i} className="border p-2 w-full mt-2 rounded" value={s} onChange={(e)=>setNtpServers(ns=>{ const a=[...ns]; a[i]=e.target.value; return a; })} placeholder={`NTP Server ${i+1}`} />
              ))}
              <button onClick={()=>setNtpServers(s=>[...s,""])} className="mt-2 px-2 py-1 bg-gray-200 rounded">+ Add NTP</button>
            </div>
          </div>

          {/* Logs */}
          <div>
            <h4 className="font-medium">Logs</h4>
            <input className="border p-2 w-full rounded mt-2" value={logSize} onChange={(e)=>setLogSize(e.target.value)} placeholder="Log Size" />
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={logRemote} onChange={(e)=>setLogRemote(e.target.checked)} /> Enable Remote Logs
            </label>
            {logRemote && (
              <div className="mt-2 space-y-2">
                <input className="border p-2 w-full rounded" value={logHost} onChange={(e)=>setLogHost(e.target.value)} placeholder="Remote Host" />
                <input className="border p-2 w-full rounded" value={logIp} onChange={(e)=>setLogIp(e.target.value)} placeholder="Remote IP" />
                <input className="border p-2 w-full rounded" value={logPort} onChange={(e)=>setLogPort(e.target.value)} placeholder="Remote Port" />
                <input className="border p-2 w-full rounded" value={logProto} onChange={(e)=>setLogProto(e.target.value)} placeholder="Protocol (udp/tcp)" />
              </div>
            )}
          </div>

          {/* Interfaces */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-medium">WiFi Interfaces</h4>
              <button onClick={addInterface} className="px-3 py-1 bg-blue-600 text-white rounded">+ Add Interface</button>
            </div>

            <div className="space-y-3 mt-2">
              {interfaces.map((iface) => (
                <div key={iface.id} className="border rounded p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <strong>{iface.id}</strong>
                    <div className="flex gap-2">
                      <select value={iface.device} onChange={(e)=>updateIface(iface.id,{device:e.target.value})} className="border p-1 rounded">
                        {radiosAvailable.map(r=> <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button className="text-sm text-red-600" onClick={()=>removeIface(iface.id)}>Remove</button>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input className="border p-2 rounded" placeholder="SSID" value={iface.ssid} onChange={(e)=>updateIface(iface.id,{ssid:e.target.value})} />
                    <input className="border p-2 rounded" placeholder="Max assoc" value={iface.maxassoc} onChange={(e)=>updateIface(iface.id,{maxassoc:e.target.value})} />
                  </div>

                  <div className="mt-2 flex gap-2">
                    <div>
                      <label className="block text-sm">Auth Mode</label>
                      <select value={iface.authMode} onChange={(e)=>updateIface(iface.id,{authMode: e.target.value as AuthMode})} className="border p-1 rounded">
                        <option value="wpa-personal">WPA Personal</option>
                        <option value="wpa-enterprise">WPA Enterprise</option>
                        <option value="hotspot">Hotspot (Captive Portal)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm">Network Mode</label>
                      <select value={iface.networkMode} onChange={(e)=>updateIface(iface.id,{networkMode: e.target.value as NetworkMode})} className="border p-1 rounded">
                        <option value="lan">LAN (bridge to lan)</option>
                        <option value="guest">Guest (isolated)</option>
                        <option value="hotspot">Hotspot (captive portal)</option>
                        <option value="corp">Enterprise (corporate)</option>
                      </select>
                    </div>
                  </div>

                  {/* Conditional fields */}
                  {iface.authMode === "wpa-personal" && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <select value={iface.encryption} onChange={(e)=>updateIface(iface.id,{encryption:e.target.value})} className="border p-2 rounded">
                        <option value="psk2">psk2</option>
                        <option value="psk-mixed">psk-mixed</option>
                        <option value="sae-mixed">sae-mixed</option>
                      </select>
                      <input placeholder="Pre-shared key" value={iface.key} onChange={(e)=>updateIface(iface.id,{key:e.target.value})} className="border p-2 rounded" />
                    </div>
                  )}

                  {iface.authMode === "wpa-enterprise" && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <input placeholder="RADIUS Server" value={iface.radiusServer} onChange={(e)=>updateIface(iface.id,{radiusServer:e.target.value})} className="border p-2 rounded" />
                      <input placeholder="Port" value={iface.radiusPort} onChange={(e)=>updateIface(iface.id,{radiusPort:e.target.value})} className="border p-2 rounded" />
                      <input placeholder="Secret" value={iface.radiusSecret} onChange={(e)=>updateIface(iface.id,{radiusSecret:e.target.value})} className="border p-2 rounded" />
                    </div>
                  )}

                  {iface.authMode === "hotspot" && (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-gray-600">Third-party Cloud Captive Portal settings</p>
                      <input placeholder="UAM Server (portal URL)" value={iface.uamServer} onChange={(e)=>updateIface(iface.id,{uamServer:e.target.value})} className="border p-2 rounded w-full" />
                      <div className="grid grid-cols-3 gap-2">
                        <input placeholder="RADIUS Server" value={iface.radiusServerHotspot} onChange={(e)=>updateIface(iface.id,{radiusServerHotspot:e.target.value})} className="border p-2 rounded" />
                        <input placeholder="Port" value={iface.radiusPortHotspot} onChange={(e)=>updateIface(iface.id,{radiusPortHotspot:e.target.value})} className="border p-2 rounded" />
                        <input placeholder="Radius Secret" value={iface.radiusSecretHotspot} onChange={(e)=>updateIface(iface.id,{radiusSecretHotspot:e.target.value})} className="border p-2 rounded" />
                      </div>
                      <input placeholder="Walled garden (comma separated)" value={iface.uamAllowed} onChange={(e)=>updateIface(iface.id,{uamAllowed:e.target.value})} className="border p-2 rounded w-full" />
                      <input placeholder="NAS ID (optional)" value={iface.nasId} onChange={(e)=>updateIface(iface.id,{nasId:e.target.value})} className="border p-2 rounded w-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 bg-gray-200 rounded">Cancel</button>
          <button onClick={handleSave} className="px-3 py-2 bg-purple-600 text-white rounded">Save Configuration</button>
        </div>
      </div>
    </div>
  );
}
