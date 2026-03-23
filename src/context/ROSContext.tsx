import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { RoverState } from '../types/telemetry';
import { generateMockData } from '../utils/mockTelemetry';
import * as ROSLIB from 'roslib';
import ROS_TOPICS, { type TopicConfig } from '../config/rosTopics';
import ROS_COMMANDS, { type RosCommandKey } from '../config/rosCommands';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ROSContextType {
  state: RoverState;
  history: TelemetryHistoryPoint[];
  connectionStatus: ConnectionStatus;
  rosUrl: string;
  cameraUrlOverrides: Record<string, string>;
  ros: ROSLIB.Ros | null;
  connectROS: (url: string) => void;
  disconnectROS: () => void;
  setCameraUrlOverride: (cameraId: string, url: string) => void;
  publishCommand: (commandKey: RosCommandKey, payload: unknown) => boolean;
  /** true when at least one real ROS message has been received */
  isLive: boolean;
}

export interface TelemetryHistoryPoint {
  timestamp: number;
  batteryVoltage: number;
  batteryLevel: number;
  batteryCurrent: number;
  wheelCurrent: number;
  speed: number;
  temperature: number;
}

const defaultState: RoverState = generateMockData();
const relayTopicLookup = new Map(ROS_TOPICS.map((cfg) => [cfg.topic, cfg]));
const CAMERA_URL_OVERRIDES_KEY = 'aries_camera_url_overrides';

const isRelayUrl = (url: string) => /^https?:\/\//i.test(url);
const normalizeRelayUrl = (url: string) => url.replace(/\/+$/, '');
const createRelayClientId = () => globalThis.crypto?.randomUUID?.() ?? `relay-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

const getStoredCameraUrlOverrides = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};

  try {
    const parsed = JSON.parse(localStorage.getItem(CAMERA_URL_OVERRIDES_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [cameraId, url]) => {
      if (typeof url === 'string' && url.trim().length > 0) {
        acc[cameraId] = url;
      }

      return acc;
    }, {});
  } catch {
    return {};
  }
};

const applyCameraUrlOverrides = (snapshot: RoverState, overrides: Record<string, string>): RoverState => {
  if (!snapshot.cameras?.length) return snapshot;

  let changed = false;
  const cameras = snapshot.cameras.map((camera) => {
    const override = overrides[camera.id]?.trim();
    if (!override || override === camera.url) {
      return camera;
    }

    changed = true;
    return { ...camera, url: override };
  });

  return changed ? { ...snapshot, cameras } : snapshot;
};

const toHistoryPoint = (snapshot: RoverState, timestamp = Date.now()): TelemetryHistoryPoint => ({
  timestamp,
  batteryVoltage: snapshot.telemetry.batteryVoltage ?? 0,
  batteryLevel: snapshot.telemetry.batteryLevel ?? 0,
  batteryCurrent: snapshot.batteryCells?.reduce((sum, cell) => sum + cell.current, 0) ?? 0,
  wheelCurrent: snapshot.wheels?.reduce((sum, wheel) => sum + wheel.current, 0) ?? 0,
  speed: snapshot.telemetry.speed ?? 0,
  temperature: snapshot.telemetry.temperature ?? 0,
});

const ROSContext = createContext<ROSContextType | undefined>(undefined);

export const ROSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rawState, setRawState] = useState<RoverState>(defaultState);
  const [history, setHistory] = useState<TelemetryHistoryPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [rosUrl, setRosUrl] = useState<string>(() =>
    localStorage.getItem('aries_ros_url') || 'ws://localhost:9090'
  );
  const [cameraUrlOverrides, setCameraUrlOverrides] = useState<Record<string, string>>(() => getStoredCameraUrlOverrides());
  const [isLive, setIsLive] = useState(false);
  const state = useMemo(() => applyCameraUrlOverrides(rawState, cameraUrlOverrides), [rawState, cameraUrlOverrides]);

  const rosRef = useRef<ROSLIB.Ros | null>(null);
  const relayRef = useRef<{ baseUrl: string; clientId: string; stream: EventSource } | null>(null);
  const subsRef = useRef<ROSLIB.Topic[]>([]);
  const publishersRef = useRef<Partial<Record<RosCommandKey, ROSLIB.Topic>>>({});
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const intentionalDisconnect = useRef(false);
  const liveRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    localStorage.setItem(CAMERA_URL_OVERRIDES_KEY, JSON.stringify(cameraUrlOverrides));
  }, [cameraUrlOverrides]);

  const markLive = useCallback(() => {
    if (liveRef.current) return;
    liveRef.current = true;
    setIsLive(true);
    console.log('[ROS] Receiving live data — mock paused');
  }, []);

  const mergeTopicData = useCallback((cfg: TopicConfig, message: any) => {
    const data = cfg.transform ? cfg.transform(message) : message;
    if (data === undefined || data === null) return;

    markLive();

    setRawState(prev => {
      const key = cfg.stateKey as keyof RoverState;
      const existing = prev[key];

      if (
        existing && typeof existing === 'object' && !Array.isArray(existing) &&
        data && typeof data === 'object' && !Array.isArray(data)
      ) {
        return { ...prev, [key]: { ...existing, ...data } };
      }

      return { ...prev, [key]: data };
    });
  }, [markLive]);

  // ── Mock data loop: runs ONLY when NOT receiving real data ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (!liveRef.current) {
        setRawState(generateMockData());
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const setCameraUrlOverride = useCallback((cameraId: string, url: string) => {
    const normalizedUrl = url.trim();

    setCameraUrlOverrides((prev) => {
      const next = { ...prev };

      if (normalizedUrl) {
        next[cameraId] = normalizedUrl;
      } else {
        delete next[cameraId];
      }

      return next;
    });
  }, []);

  // ── Rolling 60 second telemetry history ──
  useEffect(() => {
    setHistory([toHistoryPoint(stateRef.current)]);

    const interval = setInterval(() => {
      setHistory(prev => [...prev.slice(-599), toHistoryPoint(stateRef.current)]);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // ── Auto-connect on mount ──
  useEffect(() => {
    const saved = localStorage.getItem('aries_ros_url');
    if (saved) connectROS(saved);
    return () => { if (reconnectTimer.current) clearTimeout(reconnectTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Subscribe to all configured ROS topics ──
  const subscribeAll = useCallback((ros: ROSLIB.Ros) => {
    // Clean up old subscriptions
    subsRef.current.forEach(t => { try { t.unsubscribe(); } catch { /* noop */ } });
    subsRef.current = [];

    // Throttle bookkeeping per topic
    const lastMsg: Record<string, number> = {};

    ROS_TOPICS.forEach(cfg => {
      const topic = new ROSLIB.Topic({
        ros,
        name: cfg.topic,
        messageType: cfg.messageType,
      });

      const throttle = cfg.throttleMs ?? 100;

      topic.subscribe((message: any) => {
        const now = Date.now();
        if (now - (lastMsg[cfg.topic] ?? 0) < throttle) return;
        lastMsg[cfg.topic] = now;

        mergeTopicData(cfg, message);
      });

      subsRef.current.push(topic);
      console.log(`[ROS] Subscribed: ${cfg.topic} (${cfg.messageType}) → state.${cfg.stateKey}`);
    });
  }, [mergeTopicData]);

  // ── Unsubscribe all ──
  const unsubscribeAll = useCallback(() => {
    subsRef.current.forEach(t => { try { t.unsubscribe(); } catch { /* noop */ } });
    subsRef.current = [];
    publishersRef.current = {};
    liveRef.current = false;
    setIsLive(false);
  }, []);

  const disconnectRelay = useCallback((notifyServer: boolean) => {
    const relay = relayRef.current;
    relayRef.current = null;
    if (!relay) return;

    try {
      relay.stream.close();
    } catch {
      // noop
    }

    if (notifyServer) {
      void fetch(`${relay.baseUrl}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: relay.clientId }),
      }).catch(() => {
        // noop
      });
    }
  }, []);

  // ── Reconnect with backoff ──
  const scheduleReconnect = useCallback((url: string) => {
    if (intentionalDisconnect.current) return;
    const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempt.current), 15000);
    console.log(`[ROS] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${reconnectAttempt.current + 1})…`);
    reconnectTimer.current = setTimeout(() => {
      reconnectAttempt.current += 1;
      connectROS(url);
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Connect ──
  const connectROS = useCallback((url: string) => {
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    intentionalDisconnect.current = true;
    disconnectRelay(true);
    const previousRos = rosRef.current;
    rosRef.current = null;
    if (previousRos) {
      try {
        previousRos.close();
      } catch {
        // noop
      }
    }
    unsubscribeAll();

    setRosUrl(url);
    setConnectionStatus('connecting');
    localStorage.setItem('aries_ros_url', url);

    if (isRelayUrl(url)) {
      const baseUrl = normalizeRelayUrl(url);
      const clientId = createRelayClientId();
      const stream = new EventSource(`${baseUrl}/stream?clientId=${encodeURIComponent(clientId)}`);
      relayRef.current = { baseUrl, clientId, stream };
      intentionalDisconnect.current = false;

      stream.addEventListener('status', (event) => {
        if (relayRef.current?.clientId !== clientId) return;
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data) as { upstreamStatus?: ConnectionStatus };
          setConnectionStatus(payload.upstreamStatus ?? 'disconnected');
        } catch {
          setConnectionStatus('error');
        }
      });

      stream.addEventListener('topic', (event) => {
        if (relayRef.current?.clientId !== clientId) return;
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data) as { topic?: string; message?: unknown };
          if (!payload.topic) return;
          const cfg = relayTopicLookup.get(payload.topic);
          if (!cfg) return;
          mergeTopicData(cfg, payload.message);
        } catch (error) {
          console.error('[ROS] Failed to parse relay topic event:', error);
        }
      });

      stream.onopen = () => {
        if (relayRef.current?.clientId !== clientId) return;
        setConnectionStatus(prev => (prev === 'connected' ? prev : 'connecting'));

        void fetch(`${baseUrl}/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            subscriptions: ROS_TOPICS.map(({ topic, messageType, throttleMs }) => ({ topic, messageType, throttleMs })),
          }),
        }).catch((error) => {
          console.error('[ROS] Failed to register relay subscriptions:', error);
          setConnectionStatus('error');
        });
      };

      stream.onerror = () => {
        if (relayRef.current?.clientId !== clientId) return;
        if (stream.readyState === EventSource.CLOSED) {
          setConnectionStatus('disconnected');
          return;
        }
        setConnectionStatus(prev => (prev === 'connected' ? 'connecting' : 'error'));
      };

      return;
    }

    intentionalDisconnect.current = false;

    try {
      const ros = new ROSLIB.Ros({ url });

      ros.on('connection', () => {
        if (rosRef.current !== ros) return;
        console.log(`[ROS] Connected to ${url}`);
        setConnectionStatus('connected');
        reconnectAttempt.current = 0;
        subscribeAll(ros);
      });

      ros.on('error', (error: any) => {
        if (rosRef.current !== ros) return;
        console.error('[ROS] Connection error:', error);
        setConnectionStatus('error');
      });

      ros.on('close', () => {
        if (rosRef.current !== ros) return;
        console.log('[ROS] Connection closed.');
        setConnectionStatus('disconnected');
        rosRef.current = null;
        unsubscribeAll();
        if (!intentionalDisconnect.current) scheduleReconnect(url);
      });

      rosRef.current = ros;
    } catch (err) {
      console.error('[ROS] Instantiation failed', err);
      setConnectionStatus('error');
      scheduleReconnect(url);
    }
  }, [disconnectRelay, mergeTopicData, scheduleReconnect, subscribeAll, unsubscribeAll]);

  // ── Disconnect ──
  const disconnectROS = useCallback(() => {
    intentionalDisconnect.current = true;
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    disconnectRelay(true);
    unsubscribeAll();
    if (rosRef.current) rosRef.current.close();
    rosRef.current = null;
    reconnectAttempt.current = 0;
    setConnectionStatus('disconnected');
  }, [disconnectRelay, unsubscribeAll]);

  const publishCommand = useCallback((commandKey: RosCommandKey, payload: unknown) => {
    const config = ROS_COMMANDS[commandKey];

    if (connectionStatus !== 'connected' || !config) {
      return false;
    }

    const relay = relayRef.current;
    if (relay) {
      try {
        const encodedPayload = config.encode ? config.encode(payload as never) : (payload as Record<string, unknown>);
        void fetch(`${relay.baseUrl}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: config.topic,
            messageType: config.messageType,
            payload: encodedPayload,
          }),
        }).catch((error) => {
          console.error(`[ROS] Failed to publish relay command ${commandKey}:`, error);
        });
        return true;
      } catch (error) {
        console.error(`[ROS] Failed to encode relay command ${commandKey}:`, error);
        return false;
      }
    }

    const ros = rosRef.current;
    if (!ros) {
      return false;
    }

    try {
      let publisher = publishersRef.current[commandKey];

      if (!publisher) {
        publisher = new ROSLIB.Topic({
          ros,
          name: config.topic,
          messageType: config.messageType,
        });
        publishersRef.current[commandKey] = publisher;
      }

      const encodedPayload = config.encode ? config.encode(payload as never) : (payload as Record<string, unknown>);
      publisher.publish(encodedPayload as any);
      return true;
    } catch (error) {
      console.error(`[ROS] Failed to publish command ${commandKey}:`, error);
      return false;
    }
  }, [connectionStatus]);

  return (
    <ROSContext.Provider value={{ state, history, connectionStatus, rosUrl, cameraUrlOverrides, ros: rosRef.current, connectROS, disconnectROS, setCameraUrlOverride, publishCommand, isLive }}>
      {children}
    </ROSContext.Provider>
  );
};

export const useROS = () => {
  const context = useContext(ROSContext);
  if (!context) throw new Error('useROS must be used within a ROSProvider');
  return context;
};
