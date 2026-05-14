// Helper to access the global device socket map from anywhere
declare global {
  var _deviceSockets: Map<string, any>;
}

export function getDeviceSocket(deviceId: string): any {
  return global._deviceSockets?.get(deviceId);
}
