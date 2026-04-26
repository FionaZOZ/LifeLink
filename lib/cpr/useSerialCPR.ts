'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface SerialCPRSample {
  raw: number;
  voltage: number;
  pressed: boolean;
  success: boolean;
  count: number;
}

export interface PatientEmergencyContact {
  name?: string;
  relation?: string;
  phone?: string;
}

export interface PatientPhysician {
  name?: string;
  phone?: string;
}

export interface SerialPatientProfile {
  name?: string;
  dob?: string;
  bloodType?: string;
  phone?: string;
  address?: string;
  allergies?: string;
  conditions?: string;
  medications?: string;
  emergencyContact?: PatientEmergencyContact;
  physician?: PatientPhysician;
  notes?: string;
}

export interface SerialCPRLogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  detail?: string;
}

export interface SerialCPRState {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isReceiving: boolean;
  lastSample: SerialCPRSample | null;
  sampleCount: number;
  lastStatus: string | null;
  patientProfile: SerialPatientProfile | null;
  profileSyncedAt: string | null;
  profileSyncError: string | null;
  error: string | null;
  logs: SerialCPRLogEntry[];
}

interface ArduinoStatusMessage {
  status: string;
  sensor?: string;
  thresholdVoltage?: number;
  releaseVoltage?: number;
  profileCommand?: string;
}

type ParsedSerialLine =
  | { type: 'sample'; sample: SerialCPRSample }
  | { type: 'status'; status: ArduinoStatusMessage }
  | { type: 'profile'; profile: SerialPatientProfile }
  | null;

const DEFAULT_API_BASE_URL = 'http://localhost:8000';

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function describePort(port: SerialPort): string {
  const info = port.getInfo();
  const vendor = info.usbVendorId ? `vendor=0x${info.usbVendorId.toString(16)}` : 'vendor=unknown';
  const product = info.usbProductId ? `product=0x${info.usbProductId.toString(16)}` : 'product=unknown';
  return `${vendor}, ${product}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function parseNestedContact(value: unknown): PatientEmergencyContact | undefined {
  if (!isRecord(value)) return undefined;

  const contact: PatientEmergencyContact = {
    name: asOptionalString(value.name),
    relation: asOptionalString(value.relation),
    phone: asOptionalString(value.phone),
  };

  return Object.values(contact).some(Boolean) ? contact : undefined;
}

function parseNestedPhysician(value: unknown): PatientPhysician | undefined {
  if (!isRecord(value)) return undefined;

  const physician: PatientPhysician = {
    name: asOptionalString(value.name),
    phone: asOptionalString(value.phone),
  };

  return Object.values(physician).some(Boolean) ? physician : undefined;
}

function parsePatientProfile(parsed: Record<string, unknown>): SerialPatientProfile | null {
  if (parsed.type !== 'profile') return null;

  const profile: SerialPatientProfile = {
    name: asOptionalString(parsed.name),
    dob: asOptionalString(parsed.dob),
    bloodType: asOptionalString(parsed.bloodType),
    phone: asOptionalString(parsed.phone),
    address: asOptionalString(parsed.address),
    allergies: asOptionalString(parsed.allergies),
    conditions: asOptionalString(parsed.conditions),
    medications: asOptionalString(parsed.medications),
    emergencyContact: parseNestedContact(parsed.emergencyContact),
    physician: parseNestedPhysician(parsed.physician),
    notes: asOptionalString(parsed.notes),
  };

  return Object.values(profile).some(Boolean) ? profile : null;
}

function patientProfileEndpoint(): string {
  const explicitEndpoint = process.env.NEXT_PUBLIC_PATIENT_PROFILE_ENDPOINT;
  if (explicitEndpoint) return explicitEndpoint;

  const apiBaseUrl = process.env.NEXT_PUBLIC_CARDIACLINK_API_URL || DEFAULT_API_BASE_URL;
  return `${apiBaseUrl.replace(/\/$/, '')}/api/patient/profile`;
}

function profileFingerprint(profile: SerialPatientProfile): string {
  return JSON.stringify(profile);
}

async function postPatientProfile(profile: SerialPatientProfile): Promise<void> {
  const response = await fetch(patientProfileEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...profile,
      source: 'arduino_serial',
      receivedBy: 'volunteer_browser',
      clientTimestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Profile sync failed with HTTP ${response.status}${errorBody ? `: ${errorBody}` : ''}`);
  }
}

function parseLine(line: string): ParsedSerialLine {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isRecord(parsed)) return null;

    const profile = parsePatientProfile(parsed);
    if (profile) {
      return { type: 'profile', profile };
    }

    if (typeof parsed.status === 'string') {
      return {
        type: 'status',
        status: {
          status: parsed.status,
          sensor: asOptionalString(parsed.sensor),
          thresholdVoltage: typeof parsed.thresholdVoltage === 'number' ? parsed.thresholdVoltage : undefined,
          releaseVoltage: typeof parsed.releaseVoltage === 'number' ? parsed.releaseVoltage : undefined,
          profileCommand: asOptionalString(parsed.profileCommand),
        },
      };
    }

    if (
      typeof parsed.raw !== 'number' ||
      typeof parsed.voltage !== 'number' ||
      typeof parsed.pressed !== 'boolean' ||
      typeof parsed.success !== 'boolean' ||
      typeof parsed.count !== 'number'
    ) {
      return null;
    }

    return {
      type: 'sample',
      sample: {
        raw: parsed.raw,
        voltage: parsed.voltage,
        pressed: parsed.pressed,
        success: parsed.success,
        count: parsed.count,
      },
    };
  } catch {
    return null;
  }
}

export function useSerialCPR() {
  const [serialState, setSerialState] = useState<SerialCPRState>({
    isSupported: typeof navigator !== 'undefined' && 'serial' in navigator,
    isConnected: false,
    isConnecting: false,
    isReceiving: false,
    lastSample: null,
    sampleCount: 0,
    lastStatus: null,
    patientProfile: null,
    profileSyncedAt: null,
    profileSyncError: null,
    error: null,
    logs: [],
  });

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const readLoopPromiseRef = useRef<Promise<void> | null>(null);
  const connectPromiseRef = useRef<Promise<boolean> | null>(null);
  const keepReadingRef = useRef(false);
  const portIsOpenRef = useRef(false);
  const logIdRef = useRef(0);
  const sampleCounterRef = useRef(0);
  const lastLoggedStatusRef = useRef<string | null>(null);
  const lastSyncedProfileFingerprintRef = useRef<string | null>(null);

  const addLog = useCallback(
    (level: SerialCPRLogEntry['level'], message: string, detail?: string) => {
      const entry: SerialCPRLogEntry = {
        id: ++logIdRef.current,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        detail,
      };

      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      consoleMethod(`[CPR Serial] ${message}${detail ? ` — ${detail}` : ''}`);

      setSerialState((prev) => ({
        ...prev,
        logs: [entry, ...prev.logs].slice(0, 40),
      }));
    },
    []
  );

  const clearLogs = useCallback(() => {
    setSerialState((prev) => ({
      ...prev,
      logs: [],
    }));
  }, []);

  useEffect(() => {
    const supported = typeof navigator !== 'undefined' && 'serial' in navigator;
    setSerialState((prev) => ({
      ...prev,
      isSupported: supported,
    }));

    if (!supported) {
      addLog('warn', 'Web Serial unavailable', 'Use Chrome or Edge over HTTPS or localhost.');
    }
  }, [addLog]);

  const syncPatientProfile = useCallback(
    async (profile: SerialPatientProfile) => {
      const fingerprint = profileFingerprint(profile);
      if (lastSyncedProfileFingerprintRef.current === fingerprint) {
        addLog('info', 'Patient profile already synced', profile.name ? `patient=${profile.name}` : undefined);
        return;
      }

      setSerialState((prev) => ({
        ...prev,
        patientProfile: profile,
        profileSyncError: null,
      }));

      try {
        await postPatientProfile(profile);
        const syncedAt = new Date().toISOString();
        lastSyncedProfileFingerprintRef.current = fingerprint;

        setSerialState((prev) => ({
          ...prev,
          patientProfile: profile,
          profileSyncedAt: syncedAt,
          profileSyncError: null,
        }));

        addLog('info', 'Patient profile synced to server', profile.name ? `patient=${profile.name}` : undefined);
      } catch (error) {
        const message = formatError(error, 'Failed to sync patient profile to server.');
        setSerialState((prev) => ({
          ...prev,
          patientProfile: profile,
          profileSyncError: message,
        }));
        addLog('error', 'Patient profile sync failed', message);
      }
    },
    [addLog]
  );

  const cleanupReader = useCallback(async () => {
    const reader = readerRef.current;
    readerRef.current = null;

    if (!reader) return;

    try {
      await reader.cancel();
    } catch {
      // Reader may already be closed or canceled.
    }

    try {
      reader.releaseLock();
    } catch {
      // Lock may already be released by the read loop.
    }
  }, []);

  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;
    addLog('info', 'Disconnect requested');

    await cleanupReader();

    try {
      if (portRef.current && portIsOpenRef.current) {
        await portRef.current.close();
        addLog('info', 'Serial port closed');
      }
    } catch (error) {
      addLog('warn', 'Serial port close failed', formatError(error, 'Unknown close error'));
    }

    portRef.current = null;
    portIsOpenRef.current = false;
    readLoopPromiseRef.current = null;
    connectPromiseRef.current = null;

    setSerialState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      isReceiving: false,
    }));
  }, [addLog, cleanupReader]);

  const requestPatientProfile = useCallback(
    async (port: SerialPort) => {
      if (!port.writable) {
        addLog('warn', 'Cannot request patient profile', 'Serial writable stream is unavailable.');
        return;
      }

      const writer = port.writable.getWriter();
      try {
        await writer.write(new TextEncoder().encode('PROFILE\n'));
        addLog('info', 'Patient profile requested from Arduino', 'command=PROFILE');
      } finally {
        writer.releaseLock();
      }
    },
    [addLog]
  );

  const startReadLoop = useCallback(
    (port: SerialPort) => {
      keepReadingRef.current = true;

      const loop = async () => {
        if (!port.readable) {
          throw new Error('Serial port opened, but readable stream is not available.');
        }

        const reader = port.readable.getReader();
        readerRef.current = reader;
        const textDecoder = new TextDecoder();
        let buffer = '';

        addLog('info', 'Serial read loop started');

        try {
          while (keepReadingRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            if (!value) continue;

            buffer += textDecoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const parsedLine = parseLine(line);
              if (!parsedLine) continue;

              if (parsedLine.type === 'profile') {
                void syncPatientProfile(parsedLine.profile);
                continue;
              }

              if (parsedLine.type === 'status') {
                const status = parsedLine.status;
                const detailParts = [
                  status.sensor ? `sensor=${status.sensor}` : null,
                  typeof status.thresholdVoltage === 'number' ? `threshold=${status.thresholdVoltage}V` : null,
                  typeof status.releaseVoltage === 'number' ? `release=${status.releaseVoltage}V` : null,
                  status.profileCommand ? `profileCommand=${status.profileCommand}` : null,
                ].filter(Boolean);
                const statusText = status.status;

                setSerialState((prev) => ({
                  ...prev,
                  lastStatus: statusText,
                  error: null,
                }));

                if (lastLoggedStatusRef.current !== statusText) {
                  lastLoggedStatusRef.current = statusText;
                  addLog('info', `Arduino status: ${statusText}`, detailParts.join(', ') || undefined);
                }
                continue;
              }

              const sample = parsedLine.sample;
              sampleCounterRef.current += 1;
              const currentSampleCount = sampleCounterRef.current;

              setSerialState((prev) => ({
                ...prev,
                isReceiving: true,
                lastSample: sample,
                sampleCount: currentSampleCount,
                error: null,
              }));

              if (currentSampleCount === 1) {
                addLog('info', 'First sensor sample received', `raw=${sample.raw}, voltage=${sample.voltage.toFixed(3)}V`);
              }

              if (sample.success) {
                addLog(
                  'info',
                  'Successful compression detected',
                  `count=${sample.count}, voltage=${sample.voltage.toFixed(3)}V`
                );
              } else if (currentSampleCount % 100 === 0) {
                addLog('info', 'Sensor stream healthy', `samples=${currentSampleCount}, voltage=${sample.voltage.toFixed(3)}V`);
              }
            }
          }
        } finally {
          const remaining = textDecoder.decode();
          if (remaining) {
            const parsedLine = parseLine(buffer + remaining);
            if (parsedLine?.type === 'profile') {
              void syncPatientProfile(parsedLine.profile);
            } else if (parsedLine?.type === 'sample') {
              sampleCounterRef.current += 1;
              setSerialState((prev) => ({
                ...prev,
                lastSample: parsedLine.sample,
                sampleCount: sampleCounterRef.current,
              }));
            }
          }

          try {
            reader.releaseLock();
          } catch {
            // Reader may have been released during disconnect.
          }

          if (readerRef.current === reader) {
            readerRef.current = null;
          }

          setSerialState((prev) => ({
            ...prev,
            isReceiving: false,
          }));

          addLog('info', 'Serial read loop stopped');
        }
      };

      readLoopPromiseRef.current = loop().catch((error) => {
        const message = formatError(error, 'Serial read loop failed.');
        addLog('error', 'Serial read failed', message);
        keepReadingRef.current = false;
        portIsOpenRef.current = false;
        portRef.current = null;

        setSerialState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          isReceiving: false,
          error: message,
        }));
      });
    },
    [addLog, syncPatientProfile]
  );

  const connect = useCallback(async (opts: { silent?: boolean } = {}): Promise<boolean> => {
    if (connectPromiseRef.current) {
      addLog('info', 'Connect already in progress; reusing existing attempt');
      return connectPromiseRef.current;
    }

    const connectTask = (async () => {
      if (typeof navigator === 'undefined' || !('serial' in navigator) || !navigator.serial) {
        const message = 'Web Serial is not supported in this browser. Use Chrome or Edge over HTTPS or localhost.';
        if (!opts.silent) {
          setSerialState((prev) => ({
            ...prev,
            isSupported: false,
            isConnecting: false,
            error: message,
          }));
          addLog('error', 'Cannot connect to Arduino', message);
        }
        return false;
      }

      // Skip the loud "connecting" UI swap when we're trying a silent
      // auto-connect — we don't want the page to flash a CONNECTING state
      // every time a known device hasn't actually been plugged in yet.
      setSerialState((prev) => ({
        ...prev,
        isSupported: true,
        isConnecting: !opts.silent,
        error: null,
      }));

      try {
        if (portRef.current || readerRef.current || portIsOpenRef.current) {
          if (opts.silent) return false; // already connected — silent re-attempt is a no-op
          addLog('info', 'Existing serial state found; resetting before reconnect');
          await disconnect();
        }

        const knownPorts = await navigator.serial.getPorts();
        addLog('info', 'Checking previously approved serial ports', `found=${knownPorts.length}`);

        let port: SerialPort;
        if (opts.silent) {
          // Silent path: use a previously-granted port if one is plugged in;
          // never raise the browser permission dialog.
          if (knownPorts.length === 0) {
            addLog('info', 'Silent connect skipped', 'No previously-granted ports available');
            setSerialState((prev) => ({ ...prev, isConnecting: false }));
            return false;
          }
          port = knownPorts[0];
        } else {
          port = await navigator.serial.requestPort();
        }
        portRef.current = port;
        addLog('info', opts.silent ? 'Reusing previously-granted serial port' : 'Serial port selected', describePort(port));

        const openPort = async () => {
          await port.open({ baudRate: 115200 });
          portIsOpenRef.current = true;
          addLog('info', 'Serial port opened', 'baudRate=115200');
        };

        try {
          await openPort();
        } catch (error) {
          const message = formatError(error, 'Failed to open serial port.');
          const alreadyOpen =
            message.toLowerCase().includes('already open') ||
            (error instanceof DOMException && error.name === 'InvalidStateError');
          if (alreadyOpen) {
            portIsOpenRef.current = true;
            addLog('warn', 'Serial port was already open', 'Continuing with the existing open port.');
          } else {
            // Stale handle from HMR / remount: streams exist but our refs were cleared.
            const hasStreams = port.readable != null || port.writable != null;
            if (hasStreams) {
              try {
                await port.close();
                addLog('info', 'Closed stale port handle before retrying open');
              } catch (closeErr) {
                addLog('warn', 'Stale port close failed', formatError(closeErr, 'Unknown'));
              }
              portIsOpenRef.current = false;
              try {
                await openPort();
              } catch (e2) {
                throw e2;
              }
            } else {
              throw error;
            }
          }
        }

        if (!port.readable) {
          throw new Error('Serial port is open, but no readable stream is available. Close other tabs/apps using the Arduino and reconnect.');
        }

        sampleCounterRef.current = 0;
        lastLoggedStatusRef.current = null;
        lastSyncedProfileFingerprintRef.current = null;
        startReadLoop(port);
        void requestPatientProfile(port);

        setSerialState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          isReceiving: false,
          sampleCount: 0,
          lastSample: null,
          patientProfile: null,
          profileSyncedAt: null,
          profileSyncError: null,
          error: null,
        }));

        addLog('info', 'Arduino serial connected', 'Waiting for JSON sensor lines and patient profile...');
        return true;
      } catch (error) {
        const message = formatError(error, 'Failed to connect to Arduino serial port.');
        if (!opts.silent) {
          addLog('error', 'Arduino connection failed', message);
        } else {
          addLog('info', 'Silent connect failed', message);
        }

        keepReadingRef.current = false;
        await cleanupReader();

        try {
          if (portRef.current && portIsOpenRef.current) {
            await portRef.current.close();
          }
        } catch {
          // Ignore close failure after a failed connect.
        }

        portRef.current = null;
        portIsOpenRef.current = false;

        setSerialState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          isReceiving: false,
          error: opts.silent ? prev.error : message,
        }));
        return false;
      } finally {
        connectPromiseRef.current = null;
      }
    })();

    connectPromiseRef.current = connectTask;
    return connectTask;
  }, [addLog, cleanupReader, disconnect, requestPatientProfile, startReadLoop]);

  // Auto-detect already-granted devices on mount + react to plug/unplug.
  // - On mount: try a silent connect. If the user previously authorized this
  //   Arduino in this browser profile and it's currently plugged in, we
  //   reconnect without showing the browser permission dialog again.
  // - On 'connect': fired when an already-granted USB device gets plugged in
  //   while the page is open → silent reconnect.
  // - On 'disconnect': fired when our open port is unplugged → tear down state.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serial' in navigator) || !navigator.serial) return;

    void connect({ silent: true });

    const onConnect = () => {
      if (portRef.current) return; // already attached to something
      void connect({ silent: true });
    };
    const onDisconnect = (event: Event) => {
      const e = event as Event & { target?: SerialPort };
      const target = e.target;
      if (target && portRef.current && target !== portRef.current) return;
      void disconnect();
    };

    navigator.serial.addEventListener('connect', onConnect);
    navigator.serial.addEventListener('disconnect', onDisconnect);
    return () => {
      navigator.serial.removeEventListener('connect', onConnect);
      navigator.serial.removeEventListener('disconnect', onDisconnect);
    };
  }, [connect, disconnect]);

  // Serial teardown runs from `SosSerialCprProvider` (layout) with a short debounce
  // so React 18 Strict Mode’s mount→unmount→remount does not close the port between
  // the two mounts and break reconnect.

  // Public profile re-request — useful when the auto-PROFILE write right
  // after port.open() races against the Arduino's setup() Serial-attach wait
  // and the first request never reaches handleSerialCommands.
  const requestProfile = useCallback(async (): Promise<boolean> => {
    if (!portRef.current) return false;
    try {
      await requestPatientProfile(portRef.current);
      return true;
    } catch (error) {
      addLog('warn', 'Manual PROFILE request failed', formatError(error, 'Unknown write error'));
      return false;
    }
  }, [addLog, requestPatientProfile]);

  return useMemo(
    () => ({
      ...serialState,
      connect,
      disconnect,
      clearLogs,
      requestProfile,
    }),
    [serialState, connect, disconnect, clearLogs, requestProfile]
  );
}
