import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { parseHeartRate } from '../domain/heartRate';

// Web Bluetooth isn't in TypeScript's DOM lib; this is the slice we use.
interface BtCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BtCharacteristic>;
}
interface BtDevice extends EventTarget {
  name?: string;
  gatt?: {
    connect(): Promise<{
      getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<BtCharacteristic> }>;
    }>;
    disconnect(): void;
  };
}
type BluetoothNav = Navigator & {
  bluetooth?: { requestDevice(opts: { filters: Array<{ services: string[] }> }): Promise<BtDevice> };
};

export type HrSource = 'none' | 'simulator' | 'bluetooth';

interface HeartRate {
  bpm: number | null;
  source: HrSource;
  deviceName?: string;
  error?: string;
  bluetoothSupported: boolean;
  connectBluetooth: () => Promise<void>;
  startSimulator: () => void;
  disconnect: () => void;
  setSimTarget: (bpm: number) => void;
  simTarget: number;
}

const HeartRateContext = createContext<HeartRate | null>(null);

export function HeartRateProvider({ children }: { children: ReactNode }) {
  const [bpm, setBpm] = useState<number | null>(null);
  const [source, setSource] = useState<HrSource>('none');
  const [deviceName, setDeviceName] = useState<string>();
  const [error, setError] = useState<string>();
  const [simTarget, setSimTarget] = useState(82);
  const deviceRef = useRef<BtDevice | null>(null);
  const bluetooth = (navigator as BluetoothNav).bluetooth;

  // The simulator eases toward the target with a little natural wobble.
  useEffect(() => {
    if (source !== 'simulator') return;
    const timer = window.setInterval(() => {
      setBpm((prev) => {
        const current = prev ?? simTarget;
        const eased = current + (simTarget - current) * 0.35;
        return Math.round(eased + (Math.random() - 0.5) * 2);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [source, simTarget]);

  const disconnect = useCallback(() => {
    deviceRef.current?.gatt?.disconnect();
    deviceRef.current = null;
    setSource('none');
    setBpm(null);
    setDeviceName(undefined);
  }, []);

  const connectBluetooth = useCallback(async () => {
    setError(undefined);
    if (!bluetooth) {
      setError('This browser cannot reach Bluetooth devices. Try Chrome or Edge on a computer or Android.');
      return;
    }
    try {
      const device = await bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      characteristic.addEventListener('characteristicvaluechanged', () => {
        if (characteristic.value) setBpm(parseHeartRate(characteristic.value));
      });
      device.addEventListener('gattserverdisconnected', () => {
        setSource('none');
        setBpm(null);
        setError('The heart-rate device disconnected.');
      });
      await characteristic.startNotifications();
      deviceRef.current = device;
      setDeviceName(device.name ?? 'Heart-rate device');
      setSource('bluetooth');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotFoundError') return; // picker closed
      setError(e instanceof Error ? e.message : 'Could not connect.');
    }
  }, [bluetooth]);

  const startSimulator = useCallback(() => {
    deviceRef.current?.gatt?.disconnect();
    deviceRef.current = null;
    setDeviceName('Simulator');
    setError(undefined);
    setBpm(simTarget);
    setSource('simulator');
  }, [simTarget]);

  return (
    <HeartRateContext.Provider
      value={{
        bpm,
        source,
        deviceName,
        error,
        bluetoothSupported: Boolean(bluetooth),
        connectBluetooth,
        startSimulator,
        disconnect,
        setSimTarget,
        simTarget,
      }}
    >
      {children}
    </HeartRateContext.Provider>
  );
}

export function useHeartRate() {
  const hr = useContext(HeartRateContext);
  if (!hr) throw new Error('useHeartRate must be used inside HeartRateProvider');
  return hr;
}
