// Helper to access the global device socket map from anywhere
declare global {
  var _deviceSockets: Map<string, import("socket.io").Socket>;
}

export function getDeviceSocket(deviceId: string): any {
  return global._deviceSockets?.get(deviceId);
}
