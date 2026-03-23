import type { CameraStream } from '../types/telemetry';

/**
 * ─── ROS Topic Configuration ───
 *
 * Edit this file to match YOUR rover's actual ROS topic names and message types.
 * Each entry tells the dashboard which ROS topic to subscribe to, what message
 * type it publishes, and how to map the incoming fields into the dashboard state.
 *
 * The `stateKey` determines where the data lands in RoverState.
 * The `fieldMap` (optional) renames incoming message fields → state fields.
 * If omitted the raw message object is merged directly.
 *
 * After editing, rebuild/redeploy or hot-reload will pick up changes.
 */

export interface TopicConfig {
  /** ROS topic name, e.g. "/odom" */
  topic: string;
  /** ROS 2 message type, e.g. "nav_msgs/msg/Odometry" */
  messageType: string;
  /** Where in RoverState to merge the data */
  stateKey:
    | 'location'
    | 'orientation'
    | 'telemetry'
    | 'wheels'
    | 'compute'
    | 'network'
    | 'arm'
    | 'batteryCells'
    | 'drill'
    | 'science'
    | 'cameras'
    | 'environment';
  /** Throttle rate in ms (default 100). Lower = more responsive, higher = less CPU */
  throttleMs?: number;
  /**
   * Transform function: receives the raw ROS message and returns the object
   * to merge into state[stateKey]. If omitted, the raw message is used as-is.
   */
  transform?: (msg: any) => any;
}

const normalizeCameraCatalog = (payload: unknown): CameraStream[] | undefined => {
  if (!Array.isArray(payload)) return undefined;

  const cameras = payload.reduce<CameraStream[]>((acc, item, index) => {
    if (!item || typeof item !== 'object') return acc;

    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `cam${index + 1}`;
    const name = typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : `Camera ${index + 1}`;
    const url = typeof candidate.url === 'string' ? candidate.url.trim() : '';
    const status = candidate.status === 'offline' ? 'offline' : 'online';

    if (!url) return acc;

    acc.push({ id, name, url, status });
    return acc;
  }, []);

  return cameras.length > 0 ? cameras : undefined;
};

const parseCameraCatalogMessage = (msg: any): CameraStream[] | undefined => {
  if (Array.isArray(msg)) {
    return normalizeCameraCatalog(msg);
  }

  if (Array.isArray(msg?.cameras)) {
    return normalizeCameraCatalog(msg.cameras);
  }

  if (typeof msg?.data === 'string') {
    try {
      return normalizeCameraCatalog(JSON.parse(msg.data));
    } catch {
      return undefined;
    }
  }

  return undefined;
};

// ─────────────────────────────────────────────────────────
// CONFIGURE YOUR TOPICS HERE  ↓↓↓
// ─────────────────────────────────────────────────────────

const ROS_TOPICS: TopicConfig[] = [
  // ── Localization (pose from odometry / SLAM) ──
  {
    topic: '/localization/pose',
    messageType: 'nav_msgs/msg/Odometry',
    stateKey: 'location',
    transform: (msg) => ({
      x: msg.pose?.pose?.position?.x ?? 0,
      y: msg.pose?.pose?.position?.y ?? 0,
      z: msg.pose?.pose?.position?.z ?? 0,
    }),
  },

  // ── IMU → orientation ──
  {
    topic: '/imu/data',
    messageType: 'sensor_msgs/msg/Imu',
    stateKey: 'orientation',
    transform: (msg) => {
      // Quaternion → Euler (simplified)
      const q = msg.orientation;
      const sinr = 2 * (q.w * q.x + q.y * q.z);
      const cosr = 1 - 2 * (q.x * q.x + q.y * q.y);
      const roll = Math.atan2(sinr, cosr) * (180 / Math.PI);

      const sinp = 2 * (q.w * q.y - q.z * q.x);
      const pitch = (Math.abs(sinp) >= 1
        ? (90 * Math.sign(sinp))
        : Math.asin(sinp) * (180 / Math.PI));

      const siny = 2 * (q.w * q.z + q.x * q.y);
      const cosy = 1 - 2 * (q.y * q.y + q.z * q.z);
      const yaw = Math.atan2(siny, cosy) * (180 / Math.PI);

      const heading = ((yaw % 360) + 360) % 360;
      const tilt = Math.sqrt(pitch * pitch + roll * roll);

      return { pitch, roll, yaw, heading, tilt };
    },
  },

  // ── Velocity (from odometry) ──
  {
    topic: '/odom',
    messageType: 'nav_msgs/msg/Odometry',
    stateKey: 'telemetry',
    transform: (msg) => {
      const vx = msg.twist?.twist?.linear?.x ?? 0;
      const vy = msg.twist?.twist?.linear?.y ?? 0;
      return { speed: Math.sqrt(vx * vx + vy * vy) };
    },
  },

  // ── Battery (BMS publishes on custom topic) ──
  {
    topic: '/battery/status',
    messageType: 'sensor_msgs/msg/BatteryState',
    stateKey: 'telemetry',
    transform: (msg) => ({
      batteryLevel: (msg.percentage ?? 0) * 100,
      batteryVoltage: msg.voltage ?? 0,
      temperature: msg.temperature ?? 0,
    }),
  },

  // ── Individual battery cells ──
  {
    topic: '/battery/cells',
    messageType: 'std_msgs/msg/String',
    stateKey: 'batteryCells',
    transform: (msg) => {
      try { return JSON.parse(msg.data); } catch { return undefined; }
    },
  },

  // ── ODrive wheels (6x motor feedback on a single array topic) ──
  {
    topic: '/odrive/feedback',
    messageType: 'std_msgs/msg/String',
    stateKey: 'wheels',
    transform: (msg) => {
      try { return JSON.parse(msg.data); } catch { return undefined; }
    },
  },

  // ── Drill assembly ──
  {
    topic: '/drill/status',
    messageType: 'std_msgs/msg/String',
    stateKey: 'drill',
    transform: (msg) => {
      try { return JSON.parse(msg.data); } catch { return undefined; }
    },
  },

  // ── Science payload (pH, UV lamp) ──
  {
    topic: '/science/status',
    messageType: 'std_msgs/msg/String',
    stateKey: 'science',
    transform: (msg) => {
      try { return JSON.parse(msg.data); } catch { return undefined; }
    },
  },

  // ── Camera catalog (publish browser-usable feed URLs here) ──
  {
    topic: '/camera/catalog',
    messageType: 'std_msgs/msg/String',
    stateKey: 'cameras',
    transform: (msg) => parseCameraCatalogMessage(msg),
  },

  // ── Environment sensors (Teensy module → ROS PC serial) ──
  {
    topic: '/environment/sensors',
    messageType: 'std_msgs/msg/String',
    stateKey: 'environment',
    transform: (msg) => {
      try { return JSON.parse(msg.data); } catch { return undefined; }
    },
  },

  // ── Robotic arm (IGUS REBEL 6DOF) ──
  {
    topic: '/arm/joint_states',
    messageType: 'sensor_msgs/msg/JointState',
    stateKey: 'arm',
    transform: (msg) => ({
      status: 'moving',
      payload: 0,
      joints: (msg.name || []).map((name: string, i: number) => ({
        id: name,
        angle: (msg.position?.[i] ?? 0) * (180 / Math.PI),
        temp: 25,
      })),
    }),
  },
];

export default ROS_TOPICS;

