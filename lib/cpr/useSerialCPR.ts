'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface SerialCPRSample {
  raw: number;
  voltage: number;
  pressed: boolean;
  success: boolean;
  count: number;
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
  error: string | null;
  logs: SerialCPRLogEntry[];
}

interface ArduinoStatusMessage {
  status: string;
  sensor?: string;
  thresholdVoltage?: number;
  releaseVoltage?: number;
}

type ParsedSerialLine =
  | { type: 'sample'; sample: SerialCPRSample }
  | { type: 'status'; status: ArduinoStatusMessage }
  | null;

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function describePort(port: SerialPort): string {
  const info = port.getInfo();
  const vendor = info.usbVendorId ? `vendor=0x${info.usbVendorId.toString(16)}` : 'vendor=unknown';
  const product = info.usbProductId ? `product=0x${info.usbProductId.toString(16)}` : 'product=unknown';
  return `${vendor}, ${product}`;
}

function parseLine(line: string): ParsedSerialLine {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  try {
    const parsed = JSON.parse(trimmed) as Partial<SerialCPRSample> & ArduinoStatusMessage;

    if (typeof parsed.status === 'string') {
      return {
        type: 'status',
        status: {
          status: parsed.status,
          sensor: parsed.sensor,
          thresholdVoltage: parsed.thresholdVoltage,
          releaseVoltage: parsed.releaseVoltage,
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

              if (parsedLine.type === 'status') {
                const status = parsedLine.status;
                const detailParts = [
                  status.sensor ? `sensor=${status.sensor}` : null,
                  typeof status.thresholdVoltage === 'number' ? `threshold=${status.thresholdVoltage}V` : null,
                  typeof status.releaseVoltage === 'number' ? `release=${status.releaseVoltage}V` : null,
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
            if (parsedLine?.type === 'sample') {
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
    [addLog]
  );

  const connect = useCallback(async (): Promise<boolean> => {
    if (connectPromiseRef.current) {
      addLog('info', 'Connect already in progress; reusing existing attempt');
      return connectPromiseRef.current;
    }

    const connectTask = (async () => {
      if (typeof navigator === 'undefined' || !('serial' in navigator) || !navigator.serial) {
        const message = 'Web Serial is not supported in this browser. Use Chrome or Edge over HTTPS or localhost.';
        setSerialState((prev) => ({
          ...prev,
          isSupported: false,
          isConnecting: false,
          error: message,
        }));
        addLog('error', 'Cannot connect to Arduino', message);
        return false;
      }

      setSerialState((prev) => ({
        ...prev,
        isSupported: true,
        isConnecting: true,
        error: null,
      }));

      try {
        if (portRef.current || readerRef.current || portIsOpenRef.current) {
          addLog('info', 'Existing serial state found; resetting before reconnect');
          await disconnect();
        }

        const knownPorts = await navigator.serial.getPorts();
        addLog('info', 'Checking previously approved serial ports', `found=${knownPorts.length}`);

        const port = await navigator.serial.requestPort();
        portRef.current = port;
        addLog('info', 'Serial port selected', describePort(port));

        try {
          await port.open({ baudRate: 115200 });
          portIsOpenRef.current = true;
          addLog('info', 'Serial port opened', 'baudRate=115200');
        } catch (error) {
          const message = formatError(error, 'Failed to open serial port.');
          if (message.toLowerCase().includes('already open')) {
            portIsOpenRef.current = true;
            addLog('warn', 'Serial port was already open', 'Continuing with the existing open port.');
          } else {
            throw error;
          }
        }

        if (!port.readable) {
          throw new Error('Serial port is open, but no readable stream is available. Close other tabs/apps using the Arduino and reconnect.');
        }

        sampleCounterRef.current = 0;
        lastLoggedStatusRef.current = null;
        startReadLoop(port);

        setSerialState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          isReceiving: false,
          sampleCount: 0,
          lastSample: null,
          error: null,
        }));

        addLog('info', 'Arduino serial connected', 'Waiting for JSON sensor lines...');
        return true;
      } catch (error) {
        const message = formatError(error, 'Failed to connect to Arduino serial port.');
        addLog('error', 'Arduino connection failed', message);

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
          error: message,
        }));
        return false;
      } finally {
        connectPromiseRef.current = null;
      }
    })();

    connectPromiseRef.current = connectTask;
    return connectTask;
  }, [addLog, cleanupReader, disconnect, startReadLoop]);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return useMemo(
    () => ({
      ...serialState,
      connect,
      disconnect,
      clearLogs,
    }),
    [serialState, connect, disconnect, clearLogs]
  );
}
