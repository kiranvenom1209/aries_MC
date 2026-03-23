export type RosCommandKey =
  | 'driveVector'
  | 'driveEstop'
  | 'driveMode'
  | 'drillAction'
  | 'armJointTargets'
  | 'armPreset'
  | 'scienceAction';

export interface ScienceActionCommand {
  action: 'pump_on' | 'pump_off' | 'microscope_on' | 'microscope_off' | 'raman_scan';
  source?: string;
}

export interface DriveVectorCommand {
  throttle: number;
  steering: number;
  source?: string;
}

export interface DrillActionCommand {
  action: 'start' | 'stop' | 'retract' | 'extend' | 'home' | 'sample';
  power?: number;
  source?: string;
}

export interface ArmJointTargetsCommand {
  joints: Array<{ id: string; angle: number }>;
  source?: string;
}

export interface ArmPresetCommand {
  preset: 'stow' | 'deploy' | 'sample' | 'camera';
  source?: string;
}

export interface RosCommandConfig<T = unknown> {
  topic: string;
  messageType: string;
  description: string;
  encode?: (payload: T) => Record<string, unknown>;
}

const clamp = (value: number, min = -1, max = 1) => Math.max(min, Math.min(max, value));

const ROS_COMMANDS: Record<RosCommandKey, RosCommandConfig<any>> = {
  driveVector: {
    topic: '/cmd_vel',
    messageType: 'geometry_msgs/msg/Twist',
    description: 'Primary drive vector for teleop',
    encode: (payload: DriveVectorCommand) => ({
      linear: { x: clamp(payload.throttle / 100), y: 0, z: 0 },
      angular: { x: 0, y: 0, z: clamp(payload.steering / 100) },
    }),
  },
  driveEstop: {
    topic: '/drive/estop',
    messageType: 'std_msgs/msg/Bool',
    description: 'Emergency stop latch',
    encode: (payload: { engaged: boolean }) => ({ data: payload.engaged }),
  },
  driveMode: {
    topic: '/drive/mode',
    messageType: 'std_msgs/msg/String',
    description: 'Drive mode selector (auto/manual)',
    encode: (payload: { mode: string }) => ({ data: payload.mode }),
  },
  drillAction: {
    topic: '/drill/command',
    messageType: 'std_msgs/msg/String',
    description: 'Drill assembly action commands',
    encode: (payload: DrillActionCommand) => ({ data: JSON.stringify(payload) }),
  },
  armJointTargets: {
    topic: '/arm/command/joints',
    messageType: 'std_msgs/msg/String',
    description: 'Manipulator joint target setpoints',
    encode: (payload: ArmJointTargetsCommand) => ({ data: JSON.stringify(payload) }),
  },
  armPreset: {
    topic: '/arm/command/preset',
    messageType: 'std_msgs/msg/String',
    description: 'Manipulator preset poses',
    encode: (payload: ArmPresetCommand) => ({ data: JSON.stringify(payload) }),
  },
  scienceAction: {
    topic: '/science/command',
    messageType: 'std_msgs/msg/String',
    description: 'Scientific payload action commands',
    encode: (payload: ScienceActionCommand) => ({ data: JSON.stringify(payload) }),
  },
};

export default ROS_COMMANDS;