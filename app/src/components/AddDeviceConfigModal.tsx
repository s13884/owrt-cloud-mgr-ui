import React, { useEffect, useState } from "react";
import { OPENWRT_TIMEZONES } from "../data/openwrt_timezones";

type NetworkMode = "lan" | "guest" | "hotspot" | "corp";
type AuthMode = "wpa-personal" | "wpa-enterprise" | "hotspot";

type WifiInterface = {
  id: string;
  device: string;
  ssid: string;
  authMode: AuthMode;
  networkMode: NetworkMode;
  encryption?: string;
  key?: string;
  maxassoc?: string;

  // WPA Enterprise
  radiusServer?: string;
  radiusPort?: string;
  radiusSecret?: string;

  // Hotspot
  uamServer?: string;
  radiusServerHotspot?: string;
  radiusPortHotspot?: string;
  radiusSecretHotspot?: string;
  uamAllowed?: string;
  nasId?: string;
};

export default function AddDeviceConfigModal({
  open,
  onClose,
  onSave,
  deviceName,
  initialConfig,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (payload: any) => void;
  deviceName: string;
  initialConfig: any | null;
}) {
  if (!open) return null;

  // ------------------------------
  // SYSTEM & LOGS
  // ------------------------------
  const [hostname, setHostname] = useState("");
  const [timezone, setTimezone] = useState("");
  const [tzOffset, setTzOffset] = useState("");

  const [ntpEnabled, setNtpEnabled] = useState(true);
  const [ntpServers, setNtpServers] = useState<string[]>([
    "0.pool.ntp.org",
    "1.pool.ntp.org",
  ]);

  const [logSize, setLogSize] = useState("64k");
  const [logRemote, setLogRemote] = useState(false);
  const [logHost, setLogHost] = useState("");
  const [logIp, setLogIp] = useState("");
  const [logPort, setLogPort] = useState("");
  const [logProto, setLogProto] = useState("udp");

  // ------------------------------
  // WiFi
  // ------------------------------
  const radiosAvailable = ["radio0", "radio1"];

  function genIfaceId(counter: number) {
    return `ap${counter}_${Date.now().toString().slice(-4)}`;
  }

  const [ifaceCounter, setIfaceCounter] = useState(0);
  const [interfaces, setInterfaces] = useState<WifiInterface[]>([]);

  // ------------------------------
  // AUTO UPDATE TZ OFFSET
  // ------------------------------
  useEffect(() => {
    if (!timezone) return;
    const tz = OPENWRT_TIMEZONES.find((t) => t.name === timezone);
    if (tz) setTzOffset(tz.tz);
  }, [timezone]);

  // ------------------------------
  // PARSE EXISTING CONFIG (support both normalized and raw)
  // ------------------------------
  useEffect(() => {
    // No initial config -> defaults
    if (!initialConfig) {
      setHostname(deviceName || "");
      setTimezone("");
      setTzOffset("");
      setNtpServers(["0.pool.ntp.org", "1.pool.ntp.org"]);
      setNtpEnabled(true);
      setLogSize("64k");
      setLogRemote(false);
      setLogHost("");
      setLogIp("");
      setLogPort("");
      setLogProto("udp");
      setInterfaces([
        {
          id: genIfaceId(0),
          device: "radio0",
          ssid: "",
          authMode: "wpa-personal",
          networkMode: "lan",
          encryption: "psk2",
          key: "",
          maxassoc: "32",
        },
      ]);
      setIfaceCounter(1);
      return;
    }

    try {
      // `initialConfig` could be:
      // A) normalized: { hostname, timezone, tz_offset, ntp_servers, logs, interfaces: [{config, section, type, values}], raw: {...} }
      // B) raw Option-C: { system: [...], wireless: [...], network: [...], firewall: [...], chilli: [...] }
      const normalized = initialConfig && (typeof initialConfig.hostname === "string" || Array.isArray(initialConfig.interfaces));
      let raw: any = null;

      if (normalized) {
        // use normalized top-level values when available
        const n = initialConfig;
        setHostname(n.hostname || deviceName || "");
        setTimezone(n.timezone || "");
        setTzOffset(n.tz_offset || "");
        if (Array.isArray(n.ntp_servers) && n.ntp_servers.length) {
          setNtpServers(n.ntp_servers);
          setNtpEnabled(true);
        } else {
          setNtpServers(["0.pool.ntp.org", "1.pool.ntp.org"]);
        }
        if (n.logs) {
          setLogSize(n.logs.size || "64k");
          setLogRemote(n.logs.remote_enabled === "1" || n.logs.remote_enabled === true);
          setLogHost(n.logs.host || "");
          setLogIp(n.logs.ip || "");
          setLogPort(n.logs.port || "");
          setLogProto(n.logs.proto || "udp");
        } else {
          setLogSize("64k");
          setLogRemote(false);
          setLogHost("");
          setLogIp("");
          setLogPort("");
          setLogProto("udp");
        }

        // interfaces: prefer normalized.interfaces if present (supports both UCI-style { values: {...} } and already-normalized flat objects)
        if (Array.isArray(n.interfaces) && n.interfaces.length) {
          const parsed = n.interfaces.map((it: any, idx: number) => {
            // Support two shapes:
            // 1) UCI-style: { config, section, type, values: { device, ssid, network, ... } }
            // 2) Normalized flat: { id, device, ssid, authMode, networkMode, uamServer, ... }
            const vals = it.values || it || {};
            const section = it.section || it.id || genIfaceId(idx);

            // network detection: prefer explicit networkMode or network field
            const explicitNetworkMode = it.networkMode;
            const net = vals.network || it.network;
            let networkMode: NetworkMode = "lan";
            if (explicitNetworkMode) {
              networkMode = explicitNetworkMode as NetworkMode;
            } else if (typeof net === "string") {
              if (net.startsWith("guest")) networkMode = "guest";
              else if (net.startsWith("hs")) networkMode = "hotspot";
              else if (net.startsWith("corp")) networkMode = "corp";
            }

            // authMode detection: prefer explicit authMode, otherwise infer from vals
            let authMode: AuthMode = "wpa-personal";
            if (it.authMode) {
              authMode = it.authMode as AuthMode;
            } else {
              if (vals.encryption === "none") authMode = "hotspot";
              else if (vals.ieee8021x === "1") authMode = "wpa-enterprise";
            }

            // Build interface using values found either under values or top-level keys
            const device = vals.device || it.device || "radio0";
            const ssid = vals.ssid || it.ssid || "";
            const encryption = vals.encryption || it.encryption;
            const key = vals.key || it.key;
            const maxassoc = vals.maxassoc || it.maxassoc;

            // WPA Enterprise fields
            const radiusServer = vals.auth_server || vals.radiusServer || it.radiusServer || it.auth_server;
            const radiusPort = vals.auth_port || vals.radiusPort || it.radiusPort || it.auth_port;
            const radiusSecret = vals.auth_secret || vals.radiusSecret || it.radiusSecret || it.auth_secret;

            // Hotspot / Chilli fields
            const uamServer = vals.uamserver || it.uamServer || it.uamserver;
            const radiusServerHotspot = vals.radiusserver1 || it.radiusServerHotspot || it.radiusserver1;
            const radiusPortHotspot = vals.radiusport1 || it.radiusPortHotspot || it.radiusport1;
            const radiusSecretHotspot = vals.radiussecret || it.radiusSecretHotspot || it.radiussecret;
            const uamAllowed = vals.uamallowed || it.uamAllowed || it.uamallowed;
            const nasId = vals.nasid || it.nasId || it.nasid;

            return {
              id: section,
              device,
              ssid,
              authMode,
              networkMode,
              encryption,
              key,
              maxassoc,
              // enterprise
              radiusServer,
              radiusPort,
              radiusSecret,
              // hotspot
              uamServer,
              radiusServerHotspot,
              radiusPortHotspot,
              radiusSecretHotspot,
              uamAllowed,
              nasId,
            } as WifiInterface;
          });

          setInterfaces(parsed);
          setIfaceCounter(parsed.length || 1);
        } else if (n.raw) {
          // fallback to raw inside normalized
          raw = n.raw;
        }

      } else {
        // raw option-c
        raw = initialConfig;
      }

      // If we have raw UCI arrays, parse system/wireless from raw
      if (raw) {
        const sys = raw.system || [];
        // find system section with @system[0] or first with values
        const sys0 =
          sys.find((s: any) => s.section === "@system[0]") ||
          sys.find((s: any) => s.values) ||
          sys[0];

        if (sys0 && sys0.values) {
          setHostname(sys0.values.hostname || deviceName || "");
          setTimezone(sys0.values.timezone || "");
          setTzOffset(sys0.values.tz_offset || "");
          if (sys0.values.ntp?.servers && Array.isArray(sys0.values.ntp.servers)) {
            setNtpServers(sys0.values.ntp.servers);
            setNtpEnabled(true);
          }
        } else {
          setHostname(deviceName || "");
        }

        // logs: may be separate entry in system with values.logs
        const logsEntry = raw.system?.find((s: any) => s.values && s.values.logs);
        if (logsEntry?.values?.logs) {
          const l = logsEntry.values.logs;
          setLogSize(l.size || "64k");
          setLogRemote(l.remote_enabled === "1" || l.remote_enabled === true);
          setLogHost(l.host || "");
          setLogIp(l.ip || "");
          setLogPort(l.port || "");
          setLogProto(l.proto || "udp");
        }

        const chilliMap: Record<string, any> = {};
        if (Array.isArray(raw.chilli)) {
          raw.chilli.forEach((c: any) => {
            const vals = c.values || {};
            if (vals.network) {
              chilliMap[vals.network] = vals;
            }
          });
        }

        // wireless
        const wifi = raw.wireless || [];
        if (Array.isArray(wifi) && wifi.length) {
          const parsed = wifi.map((w: any, idx: number) => {
            const v = w.values || {};
            const net = v.network;

            // default networkMode
            let networkMode: NetworkMode = "lan";
            if (net?.startsWith("guest")) networkMode = "guest";
            if (net?.startsWith("hs")) networkMode = "hotspot";
            if (net?.startsWith("corp")) networkMode = "corp";

            // auth mode
            let authMode: AuthMode = "wpa-personal";
            if (v.encryption === "none") authMode = "hotspot";
            if (v.ieee8021x === "1") authMode = "wpa-enterprise";

            // merge hotspot chilli values
            const ch = chilliMap[net] || {};

            return {
              id: w.section || genIfaceId(idx),
              device: v.device || "radio0",
              ssid: v.ssid || "",
              authMode,
              networkMode,
              encryption: v.encryption,
              key: v.key,
              maxassoc: v.maxassoc,

              // enterprise
              radiusServer: v.auth_server,
              radiusPort: v.auth_port,
              radiusSecret: v.auth_secret,

              // hotspot (merge chilli)
              uamServer: ch.uamserver,
              radiusServerHotspot: ch.radiusserver1,
              radiusPortHotspot: ch.radiusport1,
              radiusSecretHotspot: ch.radiussecret,
              uamAllowed: ch.uamallowed,
              nasId: ch.nasid,
            } as WifiInterface;
          });

          setInterfaces(parsed);
          setIfaceCounter(parsed.length || 1);

        } else {
          // no wifi entries in raw -> keep single blank iface
          setInterfaces((prev) =>
            prev.length ? prev : [
              {
                id: genIfaceId(0),
                device: "radio0",
                ssid: "",
                authMode: "wpa-personal",
                networkMode: "lan",
                encryption: "psk2",
                key: "",
                maxassoc: "32",
              },
            ]
          );
        }
      }

    } catch (err) {
      console.error("Failed to parse config:", err);
      // fallback defaults
      setHostname(deviceName || "");
      if (!interfaces.length) {
        setInterfaces([
          {
            id: genIfaceId(0),
            device: "radio0",
            ssid: "",
            authMode: "wpa-personal",
            networkMode: "lan",
            encryption: "psk2",
            key: "",
            maxassoc: "32",
          },
        ]);
      }
    }
  }, [initialConfig, deviceName]);

  // ------------------------------
  // Apply user edits
  // ------------------------------
  function updateIface(id: string, patch: Partial<WifiInterface>) {
    setInterfaces((arr) => arr.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function addInterface() {
    const next = ifaceCounter + 1;
    setInterfaces((arr) => [
      ...arr,
      {
        id: genIfaceId(next),
        device: "radio0",
        ssid: "",
        authMode: "wpa-personal",
        networkMode: "guest",
        encryption: "psk2",
        key: "",
        maxassoc: "32",
      },
    ]);
    setIfaceCounter(next);
  }

  function removeIface(id: string) {
    setInterfaces((arr) => arr.filter((i) => i.id !== id));
  }

  // ------------------------------
  // BUILD UCI JSON
  // ------------------------------
  function buildUciJson() {
    const system: any[] = [
      {
        config: "system",
        section: "@system[0]",
        values: {
          hostname,
          timezone,
          tz_offset: tzOffset,
          ntp: ntpEnabled ? { servers: ntpServers } : undefined,
        },
      },
      {
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
      },
    ];

    const wireless: any[] = [];
    const network: any[] = [];
    const firewall: any[] = [];
    const chilli: any[] = [];

    interfaces.forEach((iface, idx) => {
      const netName =
        iface.networkMode === "lan"
          ? "lan"
          : iface.networkMode === "guest"
          ? `guest${idx}`
          : iface.networkMode === "hotspot"
          ? `hs${idx}`
          : `corp${idx}`;

      const wifiValues: any = {
        device: iface.device,
        mode: "ap",
        ssid: iface.ssid,
        network: netName,
      };

      if (iface.authMode === "wpa-personal") {
        wifiValues.encryption = iface.encryption;
        wifiValues.key = iface.key;
        wifiValues.maxassoc = iface.maxassoc;
      }

      if (iface.authMode === "wpa-enterprise") {
        wifiValues.encryption = "wpa2";
        wifiValues.ieee8021x = "1";
        wifiValues.auth_server = iface.radiusServer;
        wifiValues.auth_port = iface.radiusPort;
        wifiValues.auth_secret = iface.radiusSecret;
      }

      if (iface.authMode === "hotspot") {
        wifiValues.encryption = "none";
      }

      wireless.push({
        config: "wireless",
        type: "wifi-iface",
        section: iface.id,
        values: wifiValues,
      });

      if (iface.networkMode !== "lan") {
        network.push({
          config: "network",
          section: netName,
          type: "interface",
          values: { proto: "none" },
        });

        firewall.push({
          config: "firewall",
          section: `${netName}_zone`,
          type: "zone",
          values: {
            name: netName,
            network: netName,
            input: iface.networkMode === "hotspot" ? "ACCEPT" : "REJECT",
            output: "ACCEPT",
            forward: "REJECT",
            masq: "1",
          },
        });

        firewall.push({
          config: "firewall",
          section: `${netName}_to_wan`,
          type: "forwarding",
          values: { src: netName, dest: "wan" },
        });
      }

      if (iface.networkMode === "hotspot") {
        chilli.push({
          config: "chilli",
          section: `chilli${idx}`,
          type: "chilli",
          values: {
            network: netName,
            uamserver: iface.uamServer,
            radiusserver1: iface.radiusServerHotspot,
            radiusport1: iface.radiusPortHotspot,
            radiussecret: iface.radiusSecretHotspot,
            nasid: iface.nasId,
            uamallowed: iface.uamAllowed,
          },
        });
      }
    });

    return { system, wireless, network, firewall, chilli };
  }

  // ------------------------------
  // SAVE
  // ------------------------------
  function handleSave() {
    const uci = buildUciJson();
    onSave(uci);
  }

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Configure {deviceName}</h3>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto pr-2 space-y-6">

          {/* SYSTEM */}
          <div>
            <h4 className="font-medium mb-2">System</h4>

            <input className="border p-2 rounded w-full mb-2"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="Hostname"
            />

            <div className="flex gap-2">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Timezone</option>
                {OPENWRT_TIMEZONES.map((tz) => (
                  <option key={tz.name} value={tz.name}>{tz.name}</option>
                ))}
              </select>

              <input
                value={tzOffset}
                readOnly
                className="border p-2 rounded bg-gray-100 w-40"
              />
            </div>

            <div className="mt-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={ntpEnabled} onChange={(e)=>setNtpEnabled(e.target.checked)} />
                Enable NTP
              </label>

              {ntpServers.map((s, i) => (
                <input
                  key={i}
                  className="border p-2 rounded w-full mt-2"
                  value={s}
                  onChange={(e)=> {
                    const arr=[...ntpServers];
                    arr[i]=e.target.value;
                    setNtpServers(arr);
                  }}
                />
              ))}

              <button
                className="mt-2 px-2 py-1 bg-gray-300 rounded"
                onClick={() => setNtpServers([...ntpServers, ""])}
              >
                + Add NTP
              </button>
            </div>
          </div>

          {/* LOGS */}
          <div>
            <h4 className="font-medium mb-2">Logs</h4>

            <input className="border p-2 rounded w-full mb-2"
              value={logSize}
              onChange={(e) => setLogSize(e.target.value)}
              placeholder="Log size"
            />

            <label className="flex items-center gap-2">
              <input type="checkbox" checked={logRemote} onChange={(e)=>setLogRemote(e.target.checked)} />
              Enable remote logging
            </label>

            {logRemote && (
              <div className="space-y-2 mt-2">
                <input className="border p-2 rounded w-full" value={logHost} onChange={(e)=>setLogHost(e.target.value)} placeholder="Host"/>
                <input className="border p-2 rounded w-full" value={logIp} onChange={(e)=>setLogIp(e.target.value)} placeholder="IP"/>
                <input className="border p-2 rounded w-full" value={logPort} onChange={(e)=>setLogPort(e.target.value)} placeholder="Port"/>
                <input className="border p-2 rounded w-full" value={logProto} onChange={(e)=>setLogProto(e.target.value)} placeholder="Protocol"/>
              </div>
            )}
          </div>

          {/* INTERFACES */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">WiFi Interfaces</h4>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={addInterface}>
                + Add Interface
              </button>
            </div>

            <div className="space-y-4">
              {interfaces.map((iface) => (
                <div key={iface.id} className="border rounded p-3 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <strong>{iface.id}</strong>
                    <div className="flex gap-2">
                      <select
                        value={iface.device}
                        onChange={(e)=>updateIface(iface.id,{device:e.target.value})}
                        className="border p-1 rounded"
                      >
                        {radiosAvailable.map((r)=>(
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>

                      <button onClick={()=>removeIface(iface.id)} className="text-red-600">
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input className="border p-2 rounded" placeholder="SSID"
                      value={iface.ssid}
                      onChange={(e)=>updateIface(iface.id,{ssid:e.target.value})}
                    />

                    <input className="border p-2 rounded" placeholder="Maxassoc"
                      value={iface.maxassoc}
                      onChange={(e)=>updateIface(iface.id,{maxassoc:e.target.value})}
                    />
                  </div>

                  <div className="flex gap-2 mt-2">
                    <select className="border p-2 rounded"
                      value={iface.authMode}
                      onChange={(e)=>updateIface(iface.id,{authMode:e.target.value as AuthMode})}
                    >
                      <option value="wpa-personal">WPA-Personal</option>
                      <option value="wpa-enterprise">WPA-Enterprise</option>
                      <option value="hotspot">Hotspot</option>
                    </select>

                    <select className="border p-2 rounded"
                      value={iface.networkMode}
                      onChange={(e)=>updateIface(iface.id,{networkMode:e.target.value as NetworkMode})}
                    >
                      <option value="lan">LAN</option>
                      <option value="guest">Guest</option>
                      <option value="hotspot">Hotspot</option>
                      <option value="corp">Corporate</option>
                    </select>
                  </div>

                  {/* WPA PERSONAL */}
                  {iface.authMode === "wpa-personal" && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <select className="border p-2 rounded"
                        value={iface.encryption}
                        onChange={(e)=>updateIface(iface.id,{encryption:e.target.value})}
                      >
                        <option value="psk2">psk2</option>
                        <option value="psk-mixed">psk-mixed</option>
                        <option value="sae-mixed">sae-mixed</option>
                      </select>

                      <input className="border p-2 rounded" placeholder="Password"
                        value={iface.key}
                        onChange={(e)=>updateIface(iface.id,{key:e.target.value})}
                      />
                    </div>
                  )}

                  {/* WPA ENTERPRISE */}
                  {iface.authMode === "wpa-enterprise" && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <input className="border p-2 rounded" placeholder="Auth server"
                        value={iface.radiusServer}
                        onChange={(e)=>updateIface(iface.id,{radiusServer:e.target.value})}
                      />
                      <input className="border p-2 rounded" placeholder="Port"
                        value={iface.radiusPort}
                        onChange={(e)=>updateIface(iface.id,{radiusPort:e.target.value})}
                      />
                      <input className="border p-2 rounded" placeholder="Secret"
                        value={iface.radiusSecret}
                        onChange={(e)=>updateIface(iface.id,{radiusSecret:e.target.value})}
                      />
                    </div>
                  )}

                  {/* HOTSPOT */}
                  {iface.authMode === "hotspot" && (
                    <div className="space-y-2 mt-2">
                      <input className="border p-2 rounded w-full" placeholder="UAM Server"
                        value={iface.uamServer}
                        onChange={(e)=>updateIface(iface.id,{uamServer:e.target.value})}
                      />

                      <div className="grid grid-cols-3 gap-2">
                        <input className="border p-2 rounded" placeholder="RADIUS server"
                          value={iface.radiusServerHotspot}
                          onChange={(e)=>updateIface(iface.id,{radiusServerHotspot:e.target.value})}
                        />
                        <input className="border p-2 rounded" placeholder="Port"
                          value={iface.radiusPortHotspot}
                          onChange={(e)=>updateIface(iface.id,{radiusPortHotspot:e.target.value})}
                        />
                        <input className="border p-2 rounded" placeholder="Secret"
                          value={iface.radiusSecretHotspot}
                          onChange={(e)=>updateIface(iface.id,{radiusSecretHotspot:e.target.value})}
                        />
                      </div>

                      <input className="border p-2 rounded w-full" placeholder="Walled garden"
                        value={iface.uamAllowed}
                        onChange={(e)=>updateIface(iface.id,{uamAllowed:e.target.value})}
                      />
                      <input
                        className="border p-2 rounded w-full"
                        placeholder="NAS ID"
                        value={iface.nasId || ""}          // <-- ensures it loads the backend value
                        onChange={(e) =>
                          updateIface(iface.id, { nasId: e.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-2 bg-gray-200 rounded" onClick={onClose}>Cancel</button>
          <button className="px-3 py-2 bg-purple-600 text-white rounded" onClick={handleSave}>
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
