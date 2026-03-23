# LeapOne / Aries Mission Control

**Aries.space** is the student space club at **Hochschule Schmalkalden** (University of Applied Sciences). Driven by the spirit of academic excellence and curiosity, undergraduate and postgraduate students join forces with faculty mentors to design the **LEAP-ONE** planetary rover, build scientific payloads and drones, and publish open mission logs and workshops. 

Central to the club's endeavors is the **LEAP Series**—a lineup of rovers designed to excel in challenging planetary exploration scenarios, featuring adaptable architecture, state-of-the-art autonomy, and sustainable engineering. Discover more about the team's mission and projects at [hsmaries.space](https://hsmaries.space/).

> [!CAUTION]
> **PROPRIETARY SOFTWARE**: This project is **NOT open source**. All rights are reserved by Hochschule Schmalkalden and the HSM Aries Space Team. Unauthorized copying, modification, or distribution of this code or its visual assets is strictly prohibited. For full legal terms, see the [LICENSE](./LICENSE) file in the root directory.

LeapOne Mission Control is a React + TypeScript rover operations dashboard built for Aries Space Systems for:

- mission control and driving oversight
- telemetry monitoring
- power and electrical analysis
- drill and science payload operations
- robotic arm operations
- camera supervision

This project supports two connection patterns:

1. **Direct browser-to-rover mode**: each browser connects straight to the rover's `rosbridge_server`
2. **Single-workstation relay mode**: the **workstation running this project** is the only machine that connects to the rover, and every other device reads data through that workstation

For real field operations, the recommended mode is **single-workstation relay mode**.

This README assumes the rover stack is running **ROS 2 Jazzy**.

---

## Table of Contents

- [1. What this project is](#1-what-this-project-is)
- [2. Recommended field architecture](#2-recommended-field-architecture)
- [3. What screens exist in the dashboard](#3-what-screens-exist-in-the-dashboard)
- [4. Default login behavior](#4-default-login-behavior)
- [5. Important files in this repository](#5-important-files-in-this-repository)
- [6. Software requirements](#6-software-requirements)
- [7. Network requirements and IP planning](#7-network-requirements-and-ip-planning)
- [8. First-time setup on the workstation](#8-first-time-setup-on-the-workstation)
- [9. Rover-side ROS Jazzy setup](#9-rover-side-ros-jazzy-setup)
- [10. How the relay works](#10-how-the-relay-works)
- [11. Complete step-by-step field setup](#11-complete-step-by-step-field-setup)
- [12. How other devices should connect](#12-how-other-devices-should-connect)
- [13. Department-by-department screen assignment guide](#13-department-by-department-screen-assignment-guide)
- [14. Direct URLs for each department screen](#14-direct-urls-for-each-department-screen)
- [15. ROS topic mapping guide](#15-ros-topic-mapping-guide)
- [16. ROS command mapping guide](#16-ros-command-mapping-guide)
- [17. Instrument connection guide](#17-instrument-connection-guide)
- [18. Relay API and health checking](#18-relay-api-and-health-checking)
- [19. Camera feed notes](#19-camera-feed-notes)
- [20. Daily startup checklist](#20-daily-startup-checklist)
- [21. Daily shutdown checklist](#21-daily-shutdown-checklist)
- [22. Troubleshooting](#22-troubleshooting)
- [23. Quick command reference](#23-quick-command-reference)
- [24. Lab operations & bench testing layout](#24-lab-operations--bench-testing-layout)
- [25. Mission Control Center (MCC) Setup Guide (Audimax Hall Case Study)](#25-mission-control-center-mcc-setup-guide-audimax-hall-case-study)
- [26. Mission Data Logging & High-Fidelity Capture](#26-mission-data-logging--high-fidelity-capture)

---

## 1. What this project is

This dashboard renders rover state from a shared in-memory `RoverState` object managed by `src/context/ROSContext.tsx`.

The state is populated from ROS topics listed in `src/config/rosTopics.ts`.

When no live ROS data is available, the UI stays alive using simulated values from `src/utils/mockTelemetry.ts`.

When live messages arrive, the dashboard automatically switches to **LIVE** mode.

---

## 2. Recommended field architecture

### Recommended operating mode

The intended mission-control setup is:

- **one main workstation** runs the dashboard web server
- **that same workstation** runs the relay server
- **that same workstation** is the only machine that connects to rover ROS over `rosbridge_server`
- all other operator devices open the dashboard over the local network
- all other operator devices connect to the **workstation relay**, not to the rover directly

### Why this matters

If 5 operator browsers each connect directly to the rover's ROS bridge, then the rover has to serve 5 browser clients over the rover link.

That can:

- increase bandwidth usage
- increase CPU load on the rover-side bridge
- increase message duplication
- make the rover link slower or less stable

With the relay mode:

- rover sees only **one upstream ROS client**
- workstation fans out telemetry to many browsers on the local LAN
- commands from operators are forwarded by the workstation

### Data flow

```text
Rover ROS topics
    ↓
rosbridge_server on rover (ws://ROVER_IP:9090)
    ↓
Relay running on workstation (http://WORKSTATION_IP:9393)
    ↓
Browser dashboards on LAN devices
    ↓
Operators view telemetry and send commands
```

### Important operational rule

For shared mission operations, **operator devices must not connect to `ws://ROVER_IP:9090` directly**.

They should connect to the workstation relay URL, for example:

```text
http://192.168.1.20:9393
```

---

## 3. What screens exist in the dashboard

The app currently has these top-level workspaces:

| Screen | Hash route | Purpose |
| --- | --- | --- |
| Mission Control | `#mission` | Main overview screen for mapping, telemetry, and subsystem health |
| Manual Driving | `#drive` | Dedicated teleoperation console with focused cameras, drive control, and live map |
| Cameras | `#cameras` | Full camera matrix and feed catalog |
| Electrical | `#electrical` | Battery, power, load, and compute/power trend analysis |
| Telemetry Detail | `#telemetry` | Detailed health review across power, network, arm, drill, science |
| Drill Ops | `#drill` | Drill camera, drill controls, drill status, science status |
| Robotic Arm | `#arm` | Manipulator visual suite, arm status, arm pose controls |
| Science Ops | `#science` | Peristaltic pump, microscope, Raman spectrometer, and habitability analysis |
| Mission Data Analyser | `#analysis` | Post-mission CSV replay, trajectory mapping, and subsystem activity review |

### What each page contains right now

#### Initial Splash Screen

A visually engaging animated boot sequence displayed when the application loads.

![Initial Splash Screen](SS/intialsplash.png?raw=true)

#### Login Screen

Authentication gateway to access the mission control dashboard.

![Login Screen](SS/loginscreen.png?raw=true)

#### Mission Control

Main overview screen for live mapping, telemetry, subsystem health, and operator awareness.

The layout uses a three-column grid:

- **Left column** (2×3 grid): system vitals, network status, compute status, environment sensors, orientation/heading, and science payload
- **Center column**: camera grid, map view, and live system logs
- **Right column**: attitude/tilt display, ODrive wheel status, arm status, and drill status

![Mission Control dashboard](SS/mission-control.png?raw=true)

- telemetry readout (speed, battery pack, cell voltages, core temp, ROS comms)
- network status (signal strength, uplink/downlink)
- compute status (CPU/GPU usage and temps, RAM, storage)
- environment sensors (humidity, pressure, temperature, soil temp/moisture, CO₂, NH₃, CH₄)
- orientation compact (heading, pitch, roll, tilt, x/y/z position)
- science compact (pH sensor with gradient bar, UV lamp status, soil moisture)
- camera grid
- map view
- attitude panel (pitch/roll/yaw, heading compass, tilt gauge)
- ODrive panel (6× wheel motor status)
- arm status
- drill status
- live logs

#### Manual Driving

Dedicated teleop console for rover driving, camera visibility, and navigation context.

![Manual Driving dashboard](SS/manual-driving.png?raw=true)

- focused driving camera layout
- drive control panel offering active **teleop** and passive **auto mode** displays
- dynamic Porsche-style gauge sweep visualizations
- hardware E-STOP overlay integration
- full-screen ambient edge glow indicating control ownership
- map view for navigation context
- telemetry readout
- network status
- attitude panel
- ODrive panel

#### Cameras

Full camera matrix for mission visual awareness and feed monitoring.

![Cameras dashboard](SS/cameras.png?raw=true)

- mission camera matrix
- manual camera feed URL overrides via the settings modal

![Settings panel](SS/settings.png?raw=true)

#### Electrical

Power-focused workspace for battery, drivetrain load, and onboard compute trends.

![Electrical dashboard](SS/electrical.png?raw=true)

- battery voltage chart
- state of charge chart
- battery current chart
- drive current chart
- battery cell health cards
- compute status
- ODrive status

#### Telemetry Detail

Detailed subsystem verification page for power, orientation, networking, drivetrain, arm, drill, and science.

![Telemetry Detail dashboard](SS/telemetry-detail.png?raw=true)

- health summary cards
- telemetry readout
- map
- network status
- attitude display
- ODrive status
- arm status
- drill status
- science payload panel

#### Drill Ops

Operator workspace for drilling, sampling control, drill status, and science payload visibility.

![Drill Ops dashboard](SS/drill-ops.png?raw=true)

- drill camera
- drill command controls
- drill status panel
- science payload panel

#### Robotic Arm

Manipulator operations page for arm camera views, arm status, and pose controls.

![Robotic Arm dashboard](SS/robotic-arm.png?raw=true)

- manipulator visual suite
- arm status
- arm preset controls
- arm joint target controls

#### Science Ops

Dedicated workspace for sample analysis, Raman spectroscopy, and habitability assessment.

![Science Ops dashboard](SS/science.png?raw=true)

- microscope camera feed
- peristaltic pump controls
- Raman spectrometer controls and spectral results
- real-time environment-based habitability analyzer (LPI)

**Connecting the USB Microscope**: Under the **Settings (gear icon)** at the top right, locate the "Camera Feed URLs" panel. You can manually enter the HTTP stream URL (e.g., `http://192.168.1.50:8080/stream.mjpg`) for the **Microscope Optics Feed** here to directly pipe your USB microscope stream into the dashboard without running it through ROS.

**Scientific Payload Elements**:
The rover's on-board payload incorporates several instruments coordinated through this page:
- **DFRobot Gravity Analog pH Sensor**: Analyzes liquid sample acidity with real-time UI scale visualizations.
- **Peristaltic Pump**: Actuates to draw and dispense test liquid into the sampling containers.
- **USB Microscope**: Provides close-up visual telemetry. The UI overlays a 10 μm / 20 μm dynamic reticle to assist in sizing soil particulates.
- **Raman Spectrometer**: Used for detailed chemical composition scanning and mineralogy identification.
- **Storage Scales**: Tracks the payload mass of collected rock samples, deep-drilled soil, and pH test liquids.
- **Life Probability Index (LPI)**: A real-time analytical engine that computes a habitability score (0-100%) based on atmospheric gas composition (Methane, CO₂, NH₃), environmental dynamics, and multi-sensor synergy bonuses.

#### Mission Data Analyser

A powerful post-mission analytics tool for re-visualizing mission telemetry, mapping rover trajectories, and performing deep-dive subsystem audits.

- **High-Fidelity Replay**: Reconstructs missions in 10Hz (0.1s) increments for perfect visual synchronization.
- **Atmospheric Laboratory View**: A full-width, high-density dashboard for atmospheric trend analysis, providing 8-sensor synchronous monitoring during scientific missions.
- **Mission Timeline Scrubber**: An interactive browser for mission logs with activity-aware highlights:
    - **Cyan Regions**: Indicates periods when the drill was active or retracting.
    - **Purple Regions**: Indicates manipulator (arm) movement.
- **Trajectory Mapping**: Visualizes the rover's physical path on the local grid based on recorded odometry coordinates.
- **CSV Data Interface**: Load any `.csv` mission log exported from the dashboard to perform historical audits.
- **Terminal Standby**: A cinematic dashboard-ready view designed for large control room displays when no mission data is currently loaded.

#### Lock Screen

Secure lock screen accessible from the header to restrict access while leaving the dashboard active.

![Lock Screen](SS/lockscreen.png?raw=true)

---

## 4. Default login behavior

### Current default credentials

The current login screen accepts:

![Login Screen](SS/loginscreen.png?raw=true)

```text
username: admin
password: leap1aries
```

### Important note

These credentials are currently hardcoded in `src/components/auth/LoginScreen.tsx`.

That means:

- this is convenience/auth-gating for operations UI access
- this is **not** secure backend authentication
- you should change this if you plan to use this outside a trusted local operations environment

### Session persistence behavior

Once a browser logs in successfully on a device:

- auth is stored in `localStorage`
- the device stays logged in on future reloads/openings
- it remains logged in until the user explicitly clicks **Logout**

This is useful for operations laptops that stay assigned to specific roles.

---

## 5. Important files in this repository

| File | Purpose |
| --- | --- |
| `src/App.tsx` | top-level app shell, screen routing, login flow, quick connect, mode select |
| `src/context/ROSContext.tsx` | ROS connection lifecycle, relay/direct switching, topic subscriptions, live/sim switching |
| `src/config/rosTopics.ts` | main live telemetry topic mapping file |
| `src/config/rosCommands.ts` | command topic mapping file |
| `server/rosRelayServer.mjs` | single-upstream relay server |
| `src/types/telemetry.ts` | `RoverState` type definitions (includes `EnvironmentData`, `DrillData`, `ScienceData`, etc.) |
| `src/components/telemetry/ConnectionModal.tsx` | connection UI for relay/direct endpoints and manual camera feed URL overrides |
| `src/components/telemetry/TelemetryReadout.tsx` | system vitals card (speed, battery pack, cell voltages, core temp, ROS comms) |
| `src/components/telemetry/NetworkStatus.tsx` | comms/network card (signal strength dBm, uplink/downlink Mbps) |
| `src/components/telemetry/ComputeStatus.tsx` | compute card (CPU/GPU usage and temps, RAM, NVMe storage) |
| `src/components/telemetry/EnvironmentSensors.tsx` | Teensy environment sensor card (humidity, pressure, temps, soil, gas readings) |
| `src/components/telemetry/OrientationCompact.tsx` | compact orientation card (heading, pitch, roll, tilt, x/y/z position) |
| `src/components/telemetry/ScienceCompact.tsx` | compact science payload card (pH sensor, UV lamp, soil moisture) |
| `src/components/telemetry/AttitudeCombined.tsx` | attitude display (pitch/roll/yaw gauges, heading compass, tilt indicator) |
| `src/components/telemetry/ODriveStatus.tsx` | ODrive wheel motor status (6× motor feedback) |
| `src/components/telemetry/ArmStatus.tsx` | IGUS REBEL 6DOF arm joint status |
| `src/components/telemetry/DrillStatus.tsx` | drill assembly status (motors, actuator, limit switches, depth) |
| `src/components/telemetry/SciencePayload.tsx` | full science payload panel (pH meter, UV lamp, soil moisture — used on Drill Ops and Telemetry Detail pages) |
| `src/components/telemetry/LiveLogs.tsx` | real-time system log feed |
| `src/components/media/CameraGrid.tsx` | camera matrix and feed panels |
| `src/components/media/MapView.tsx` | rover position map with waypoints |
| `src/utils/mockTelemetry.ts` | simulated telemetry fallback for all subsystems |
| `src/pages/MissionControlPage.tsx` | mission control layout (3-column, left 2×3 grid, center camera/map/logs, right attitude/drive/arm/drill) |
| `src/pages/ManualDrivePage.tsx` | manual teleop driving console |
| `src/pages/CamerasPage.tsx` | full camera matrix page |
| `src/pages/ElectricalPage.tsx` | battery, power, and compute trend analysis page |
| `src/pages/TelemetryDetailPage.tsx` | detailed subsystem health review page |
| `src/pages/DrillOpsPage.tsx` | drill operations and science payload page |
| `src/pages/ArmOpsPage.tsx` | robotic arm operations page |

---

## 6. Software requirements

On the **workstation** you need:

- Node.js
- npm
- access to this repository
- network reachability to the rover's `rosbridge_server`
- local firewall rules that allow LAN devices to reach the workstation's web port and relay port

On the **rover** you need:

- ROS 2 Jazzy
- `rosbridge_server`
- the telemetry topics you want the dashboard to consume

On **operator devices** you need:

- a browser
- LAN access to the workstation IP

---

## 7. Network requirements and IP planning

Before field use, decide the actual IP addresses.

### Example network plan

```text
Workstation IP: 192.168.1.20
Rover ROS bridge IP: 192.168.1.50
Web dashboard port (dev): 5173
Web dashboard port (preview): 4173
Relay port: 9393
```

### Example URLs from that plan

#### Rover upstream ROS bridge

```text
ws://192.168.1.50:9090
```

#### Workstation relay

```text
http://192.168.1.20:9393
```

#### Workstation dashboard in development mode

```text
http://192.168.1.20:5173
```

#### Workstation dashboard in preview mode

```text
http://192.168.1.20:4173
```

### Common mistake to avoid

Do **not** tell remote operator devices to open:

```text
http://localhost:5173
```

On a remote device, `localhost` means **that device itself**, not the workstation.

Remote devices must use the workstation IP, for example:

```text
http://192.168.1.20:5173
```

---

## 8. First-time setup on the workstation

### 8.1 Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd aries_mc
```

### 8.2 Install dependencies

```bash
npm install
```

### 8.3 Review available scripts

The project currently provides these scripts:

```json
{
  "dev": "vite --host 0.0.0.0",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview --host 0.0.0.0",
  "dev:local": "vite --host 0.0.0.0",
  "relay": "node server/rosRelayServer.mjs"
}
```

### 8.4 Understand what each script does

#### `npm run dev`

- starts the Vite development server
- serves the dashboard on the LAN
- default port is usually `5173`
- best for active development and testing

#### `npm run build`

- builds local static assets into `dist/`
- checks TypeScript while building
- **does not host the app by itself**

#### `npm run preview`

- serves the already-built `dist/` output
- default port is usually `4173`
- useful when you want to run the built app locally on the LAN instead of the dev server

#### `npm run relay`

- starts the relay server on the workstation
- relay default port is `9393`
- relay opens one upstream connection to the rover ROS bridge

### 8.5 First local test without rover

You can start the frontend even without live ROS:

```bash
npm run dev
```

The UI will show simulated telemetry until live messages arrive.

---

## 9. Rover-side ROS Jazzy setup

### 9.1 Install rosbridge

Install the rosbridge suite on the rover:

```bash
sudo apt-get install ros-jazzy-rosbridge-suite
```

Source the ROS Jazzy environment in the shell you will use:

```bash
source /opt/ros/jazzy/setup.bash
```

### 9.2 Launch rosbridge

Launch the rover WebSocket bridge:

```bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml port:=9090
```

### 9.3 Verify rover ROS bridge is reachable

From the workstation, verify that the rover endpoint is the IP you expect.

Example target:

```text
ws://192.168.1.50:9090
```

### 9.4 Verify topics exist before touching the dashboard

From a ROS Jazzy shell on the rover, verify that the required topics are actually publishing:

```bash
ros2 topic list
ros2 topic echo /localization/pose
ros2 topic echo /imu/data
ros2 topic echo /odom
ros2 topic echo /battery/status
ros2 topic echo /battery/cells
ros2 topic echo /odrive/feedback
ros2 topic echo /environment/sensors
ros2 topic echo /drill/status
ros2 topic echo /science/status
ros2 topic echo /arm/joint_states
ros2 topic echo /camera/catalog
```

If the rover does not publish the needed topics, the dashboard cannot show live data even if the relay is connected.

---

## 10. How the relay works

The relay lives in:

```text
server/rosRelayServer.mjs
```

### Relay responsibilities

- maintain one upstream `roslib` connection to the rover
- subscribe upstream only to the topics requested by browser clients
- fan telemetry out to browsers using Server-Sent Events (SSE)
- accept command publishes from browsers over HTTP POST
- expose a `/health` endpoint for quick checks
- reconnect automatically if the rover-side ROS bridge drops

### Relay default settings

- listen host: `0.0.0.0`
- listen port: `9393`
- default upstream: `ws://localhost:9090`

### Relay runtime configuration

You can configure it either with environment variables or CLI flags.

#### Environment variable example

```bash
ROS_RELAY_UPSTREAM=ws://192.168.1.50:9090 npm run relay
```

#### CLI flag example

```bash
node server/rosRelayServer.mjs --upstream ws://192.168.1.50:9090 --host 0.0.0.0 --port 9393
```

### Relay status model

The relay reports one of these upstream states:

- `connecting`
- `connected`
- `error`
- `disconnected`

### What the browser does in relay mode

If the operator enters an `http://...` endpoint in the connection modal, the frontend treats it as a relay endpoint instead of a direct ROS WebSocket endpoint.

![Settings Panel](SS/settings.png?raw=true)

That means:

- telemetry comes from the relay stream
- command publishes go through the relay
- the browser does **not** connect directly to the rover

---

## 11. Complete step-by-step field setup

This is the full recommended sequence for real operations.

### Step 1: connect the workstation to the rover network

Make sure the workstation can reach the rover IP.

Example assumptions:

```text
workstation = 192.168.1.20
rover = 192.168.1.50
```

### Step 2: connect operator devices to the same local network as the workstation

The operator devices only need access to the workstation.

They do **not** need direct ROS access to the rover.

### Step 3: start rover rosbridge

On the rover:

```bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml port:=9090
```

### Step 4: start the relay on the workstation

On the workstation, in the project directory:

```bash
ROS_RELAY_UPSTREAM=ws://192.168.1.50:9090 npm run relay
```

Expected startup log pattern:

```text
[relay] listening on http://0.0.0.0:9393
[relay] upstream target ws://192.168.1.50:9090
[relay] connected upstream ws://192.168.1.50:9090
```

### Step 5: start the dashboard web server on the workstation

For development mode:

```bash
npm run dev
```

That usually serves the UI at:

```text
http://192.168.1.20:5173
```

If you want to serve the built local bundle instead:

```bash
npm run build
npm run preview
```

That usually serves the UI at:

```text
http://192.168.1.20:4173
```

### Step 6: open the dashboard on the workstation itself

Example:

```text
http://192.168.1.20:5173
```

### Step 7: log in on the workstation browser

Use:

```text
username: admin
password: leap1aries
```

### Step 8: connect the dashboard to the workstation relay

Open the connection modal and use:

```text
http://192.168.1.20:9393
```

Do **not** use the rover ROS bridge directly on operator browsers when running in shared mission mode.

### Step 9: confirm the dashboard switches from SIM to LIVE

Expected behavior:

- connection status becomes `connected`
- the LIVE badge appears once real messages are received
- simulated values stop updating

### Step 10: open other department devices on the LAN

Each department opens the dashboard from the workstation host URL, for example:

```text
http://192.168.1.20:5173
```

Then each device connects to the relay URL:

```text
http://192.168.1.20:9393
```

### Step 11: assign each device its own screen

Use either:

- the **Mode** button in the header
- or direct route URLs with hashes such as `#drill` and `#arm`

Examples:

```text
http://192.168.1.20:5173/#mission
http://192.168.1.20:5173/#drive
http://192.168.1.20:5173/#cameras
http://192.168.1.20:5173/#electrical
http://192.168.1.20:5173/#telemetry
http://192.168.1.20:5173/#drill
http://192.168.1.20:5173/#arm
http://192.168.1.20:5173/#science
```

### Step 12: verify only one upstream rover connection exists

Use relay health:

```bash
curl http://192.168.1.20:9393/health
```

You should see the relay report its upstream state and its client count.

The important architecture point is that all browser clients are talking to the relay, not all opening their own rover ROS connections.

---

## 12. How other devices should connect

Each remote device should follow this exact logic:

### 12.1 Open the dashboard from the workstation

Example:

```text
http://192.168.1.20:5173
```

### 12.2 Log in once

```text
username: admin
password: leap1aries
```

### 12.3 Open the connection modal

Use the **Host Relay** preset or manually enter:

```text
http://192.168.1.20:9393
```

### 12.4 Select the screen for that department

Either use the **Mode** button or open the exact hash route directly.

### 12.5 Leave that device on its assigned page

Once logged in, the browser will remember its auth state until Logout is pressed.

### Tiny but important detail

If any operator types this into the connection modal:

```text
ws://192.168.1.50:9090
```

then that browser becomes a **direct rover client** and bypasses the single-uplink design.

That is exactly what you want to avoid during multi-operator missions.

---

## 13. Department-by-department screen assignment guide

Below is a practical assignment plan for a multi-person operations room.

### Recommended workstation/screen assignments

| Department / Role | Recommended page | URL example |
| --- | --- | --- |
| Mission Commander / Main Display | Mission Control | `http://WORKSTATION_IP:5173/#mission` |
| Driver / Teleop Operator | Manual Driving | `http://WORKSTATION_IP:5173/#drive` |
| Camera Officer / Situational Awareness | Cameras | `http://WORKSTATION_IP:5173/#cameras` |
| Electrical / Systems Engineer | Electrical | `http://WORKSTATION_IP:5173/#electrical` |
| Systems Health / Telemetry Analyst | Telemetry Detail | `http://WORKSTATION_IP:5173/#telemetry` |
| Drill Operator | Drill Ops | `http://WORKSTATION_IP:5173/#drill` |
| Arm / Manipulator Operator | Robotic Arm | `http://WORKSTATION_IP:5173/#arm` |
| Science Officer / Diagnostics | Science Ops | `http://WORKSTATION_IP:5173/#science` |
| Mission Analyst / Historian | Data Analyser | `http://WORKSTATION_IP:5173/#analysis` |

### Role 1: Mission Commander / Main Display

Use:

```text
#mission
```

Why:

- central overview of rover state
- map and cameras together
- telemetry and attitude in one place
- keeps the strategic overview visible on the big screen

Recommended use:

- keep this on the largest main display
- assign to the primary decision-maker or mission lead

### Role 2: Driver / Manual Teleop Operator

Use:

```text
#drive
```

Why:

- focused driving camera layout
- live drive vectors and E-stop access
- map view stays visible during teleop
- critical vehicle motion indicators stay grouped together

Recommended use:

- assign to the operator actively driving the rover
- keep this separate from the big-screen mission overview when possible

### Role 3: Camera Officer / Visual Awareness

Use:

```text
#cameras
```

Why:

- dedicated camera matrix
- feed catalog on the side
- quick view of camera online/offline state

Recommended use:

- assign a wide display if available
- useful for pathfinding, obstacle watch, and team awareness

### Role 4: Electrical / Systems Engineer

Use:

```text
#electrical
```

Why:

- battery charts
- current charts
- cell health panels
- compute status
- ODrive load visibility

Recommended use:

- monitor pack voltage, cell imbalance, current draw, and compute/power conditions

### Role 5: Telemetry Analyst / Safety Monitor

Use:

```text
#telemetry
```

Why:

- consolidated health checks
- battery/temp/tilt/signal summaries
- network, map, drivetrain, arm, drill, science all in one view

Recommended use:

- useful for a systems engineer or mission safety observer

### Role 6: Science / Drill Operator

Use:

```text
#drill
```

Why:

- drill camera is prioritized
- drill command controls are present
- drill and science status are in one screen

Recommended use:

- keep this dedicated to sampling operations
- do not overload the drill operator with other screens

### Role 7: Arm / Manipulator Operator

Use:

```text
#arm
```

Why:

- manipulator camera suite
- arm status panel
- arm presets and joint targets

Recommended use:

- best for a dedicated arm operator station

### Role 8: Science Officer / Diagnostics

Use:

```text
#science
```

Why:

- dedicated environmental monitoring and logging
- microscope visualization with scale overlay
- direct control of peristaltic pump and Raman spectrometer
- tracks payload weights for scientific samples

Recommended use:

- assign to the lead scientist or payload operator
- keep separate from gross manipulation tools like the drill or arm

### Physical Console Layout Recommendation

For a professional and high-performance "Mission Control" experience, we recommend a tiered physical monitor arrangement. 

> [!TIP]
> **See Section 24: [Mission Control Center (MCC) Setup Guide](#24-mission-control-center-mcc-setup-guide)** for the full blueprint on how to configure a professional control room with big-screen projectors and spectator zones.

Below is the basic logical grouping:

1. **Center (Primary Display)**: `Mission Control (#mission)`
2. **Left Flank (Drivers & Nav)**: `Manual Driving (#drive)` + `Cameras (#cameras)`
3. **Right Flank (Engineering & Science)**: `Electrical (#electrical)` + `Science Ops (#science)`
4. **Overhead / Auxiliary**: `Telemetry Detail (#telemetry)` + `Drill Ops (#drill)`

### Small-team version

If you have only 2 or 3 operators:

- Operator 1: `#mission`
- Operator 2: `#drive`
- Operator 3: `#drill` or `#science` depending on current task

### Large-room version

If you have 6 or 7 screens:

- Screen 1: `#mission`
- Screen 2: `#drive`
- Screen 3: `#cameras`
- Screen 4: `#electrical`
- Screen 5: `#telemetry`
- Screen 6: `#drill`
- Screen 7: `#arm`

---

## 14. Direct URLs for each department screen

Replace `WORKSTATION_IP` with the real workstation address.

### Development mode examples

```text
http://WORKSTATION_IP:5173/#mission
http://WORKSTATION_IP:5173/#drive
http://WORKSTATION_IP:5173/#cameras
http://WORKSTATION_IP:5173/#electrical
http://WORKSTATION_IP:5173/#telemetry
http://WORKSTATION_IP:5173/#drill
http://WORKSTATION_IP:5173/#arm
http://WORKSTATION_IP:5173/#science
```

### Built local preview examples

```text
http://WORKSTATION_IP:4173/#mission
http://WORKSTATION_IP:4173/#drive
http://WORKSTATION_IP:4173/#cameras
http://WORKSTATION_IP:4173/#electrical
http://WORKSTATION_IP:4173/#telemetry
http://WORKSTATION_IP:4173/#drill
http://WORKSTATION_IP:4173/#arm
http://WORKSTATION_IP:4173/#science
```

### Concrete example using sample IP `192.168.1.20`

```text
http://192.168.1.20:5173/#mission
http://192.168.1.20:5173/#drive
http://192.168.1.20:5173/#cameras
http://192.168.1.20:5173/#electrical
http://192.168.1.20:5173/#telemetry
http://192.168.1.20:5173/#drill
http://192.168.1.20:5173/#arm
http://192.168.1.20:5173/#science
```

---

## 15. ROS topic mapping guide

The main telemetry configuration file is:

```text
src/config/rosTopics.ts
```

Each entry defines:

- `topic`: ROS topic name
- `messageType`: ROS type string
- `stateKey`: where the transformed data lands in dashboard state
- `throttleMs`: client-side throttle in milliseconds
- `transform`: optional conversion function from raw ROS message to dashboard shape

### Current default topics

```ts
const ROS_TOPICS = [
  { topic: '/localization/pose',    messageType: 'nav_msgs/msg/Odometry',       stateKey: 'location' },
  { topic: '/imu/data',            messageType: 'sensor_msgs/msg/Imu',         stateKey: 'orientation' },
  { topic: '/odom',                messageType: 'nav_msgs/msg/Odometry',       stateKey: 'telemetry' },
  { topic: '/battery/status',      messageType: 'sensor_msgs/msg/BatteryState', stateKey: 'telemetry' },
  { topic: '/battery/cells',       messageType: 'std_msgs/msg/String',         stateKey: 'batteryCells' },
  { topic: '/odrive/feedback',     messageType: 'std_msgs/msg/String',         stateKey: 'wheels' },
  { topic: '/drill/status',        messageType: 'std_msgs/msg/String',         stateKey: 'drill' },
  { topic: '/science/status',      messageType: 'std_msgs/msg/String',         stateKey: 'science' },
  { topic: '/camera/catalog',      messageType: 'std_msgs/msg/String',         stateKey: 'cameras' },
  { topic: '/environment/sensors', messageType: 'std_msgs/msg/String',         stateKey: 'environment' },
  { topic: '/arm/joint_states',    messageType: 'sensor_msgs/msg/JointState',  stateKey: 'arm' }
]
```

For ROS 2 Jazzy, use `package/msg/Type` message strings in the dashboard config.

### Supported `stateKey` targets

- `location`
- `orientation`
- `telemetry`
- `wheels`
- `compute`
- `network`
- `arm`
- `batteryCells`
- `drill`
- `science`
- `cameras`
- `environment`

### Example: Localization mapping

```ts
{
  topic: '/localization/pose',
  messageType: 'nav_msgs/msg/Odometry',
  stateKey: 'location',
  transform: (msg) => ({
    x: msg.pose?.pose?.position?.x ?? 0,
    y: msg.pose?.pose?.position?.y ?? 0,
    z: msg.pose?.pose?.position?.z ?? 0,
  }),
}
```

### Example: custom JSON string mapping

```ts
{
  topic: '/science/status',
  messageType: 'std_msgs/msg/String',
  stateKey: 'science',
  transform: (msg) => {
    try { return JSON.parse(msg.data); } catch { return undefined; }
  },
}
```

### Important mapping rule

The UI only updates correctly if your `transform` returns the shape expected by the page components.

If a topic connects but the data shape is wrong, the page may stay partially simulated or show zeros.

### Example custom payloads expected today

#### Battery cells

```json
[
  {"id":"B1","voltage":12.8,"current":3.1,"temp":28,"soc":97},
  {"id":"B2","voltage":12.7,"current":3.0,"temp":29,"soc":96}
]
```

#### ODrive wheel aggregate

```json
[
  {"id":"FL","velocity":120,"current":3.5,"temperature":42,"voltage":24.1,"status":"normal"},
  {"id":"FR","velocity":118,"current":3.6,"temperature":41,"voltage":24.1,"status":"normal"}
]
```

#### Drill status

```json
{
  "motors": [],
  "actuatorPosition": 125,
  "actuatorExtended": true,
  "limitSwitchTop": false,
  "limitSwitchBottom": true,
  "drillDepth": 310,
  "status": "sampling"
}
```

#### Science status

```json
{
  "ph": 7.1,
  "phValid": true,
  "uvLampOn": false,
  "uvLampRuntime": 120,
  "soilMoisture": 26,
  "sampleCollected": true,
  "pumpOn": false,
  "microscopeOn": true,
  "ramanStatus": "idle",
  "ramanResult": "Awaiting Specimen",
  "rockSampleWeight": 45.2,
  "soilSampleWeight": 120.5,
  "liquidSampleLevel": 15.0
}
```

#### Environment sensors

Published by the Teensy environmental sensor module connected to the ROS PC via serial.

```json
{
  "humidity": 40.5,
  "airPressure": 1019.7,
  "temperature": 12.1,
  "soilTemperature": 22.1,
  "soilMoisture": 16.4,
  "co2": 414.5,
  "nh3": 87.4,
  "ch4": 1987
}
```

Field details:

| Field | Unit | Description |
| --- | --- | --- |
| `humidity` | % RH | relative humidity |
| `airPressure` | mb | millibar atmospheric pressure |
| `temperature` | °C | ambient air temperature |
| `soilTemperature` | °C | soil probe temperature |
| `soilMoisture` | % | volumetric water content |
| `co2` | ppm | carbon dioxide concentration |
| `nh3` | ppm | ammonia concentration |
| `ch4` | ppb | methane concentration |

#### Camera catalog

Default dashboard topic:

```text
/camera/catalog
```

Default message type:

```text
std_msgs/msg/String
```

Expected `data` payload:

```json
[
  {"id":"cam1","name":"Front Cam","url":"http://video-host/front.mjpeg","status":"online"},
  {"id":"cam2","name":"Arm Cam","url":"http://video-host/arm.mjpeg","status":"online"}
]
```

---

## 16. ROS command mapping guide

The command mapping file is:

```text
src/config/rosCommands.ts
```

### Current commands

| Command key | Topic | Message type | Purpose |
| --- | --- | --- | --- |
| `driveVector` | `/cmd_vel` | `geometry_msgs/msg/Twist` | main drive vector |
| `driveEstop` | `/drive/estop` | `std_msgs/msg/Bool` | emergency stop latch |
| `driveMode` | `/drive/mode` | `std_msgs/msg/String` | Drive mode selector (auto/manual) |
| `drillAction` | `/drill/command` | `std_msgs/msg/String` | drill actions |
| `armJointTargets` | `/arm/command/joints` | `std_msgs/msg/String` | arm joint targets |
| `armPreset` | `/arm/command/preset` | `std_msgs/msg/String` | arm preset poses |

### Current drill actions

- `start`
- `stop`
- `retract`
- `extend`
- `home`
- `sample`

### Current arm presets

- `stow`
- `deploy`
- `sample`
- `camera`

### How to Connect Drive Control to ROS 2 Jazzy

This dashboard publishes driving commands intended for a lightweight ROS 2 rover drive node. Below is how the hardware and navigation stack should react:

#### 1. Throttle and Steering
- **Topic**: `/cmd_vel`
- **Message Type**: `geometry_msgs/msg/Twist`
- **Behavior**: 
  - The UI normalizes the 0-100% ranges into standard Cartesian vectors.
  - `linear.x`: Throttle (from `-1.0` full reverse to `1.0` full forward).
  - `angular.z`: Steering (from `-1.0` full right to `1.0` full left).
  - *Note: You can tweak the axis mapping in `src/config/rosCommands.ts` if your rover's kinematics differ.*

#### 2. Emergency Stop (E-STOP)
- **Topic**: `/drive/estop`
- **Message Type**: `std_msgs/msg/Bool`
- **Behavior**: 
  - `data: true`: E-STOP is engaged. The rover hardware should immediately sever motor power.
  - `data: false`: E-STOP is disengaged. Normal operations can resume.
  
#### 3. Auto / Manual Mode Switch
- **Topic**: `/drive/mode`
- **Message Type**: `std_msgs/msg/String`
- **Behavior**:
  - `data: "auto"`: The rover should switch to its autonomous navigation stack (e.g. Nav2) and halt any manual `/cmd_vel` inputs sent from the dashboard.
  - `data: "manual"`: The rover should release navigation autonomy and accept manual teleop commands from `/cmd_vel`.

### Example encoded command payloads

#### Drive vector

Input from UI:

```json
{ "throttle": 50, "steering": -25, "source": "drive-control" }
```

Encoded ROS message:

```json
{
  "linear": { "x": 0.5, "y": 0, "z": 0 },
  "angular": { "x": 0, "y": 0, "z": -0.25 }
}
```

#### Drive e-stop

```json
{ "data": true }
```

#### Drill action

```json
{ "data": "{\"action\":\"sample\",\"power\":55,\"source\":\"drill-ops\"}" }
```

#### Arm preset

```json
{ "data": "{\"preset\":\"deploy\",\"source\":\"arm-ops\"}" }
```

### If your rover uses different command topics

Edit `src/config/rosCommands.ts` and change:

- topic names
- ROS message types
- payload encoding

---

## 17. Instrument connection guide

This dashboard relies on ROS 2 and networking to communicate with all physical rover instruments. Here is how each hardware element interfaces with the dashboard:

### ODrive Motor Controllers

- **Hardware**: ODrive S1 Kit
- **Connection**: Connect to the ROS 2 PC via USB or CAN. A ROS 2 ODrive driver node must publish aggregate status to `/odrive/feedback`.
- **Configuration**: The dashboard expects a JSON array containing velocity, current, temperature, voltage, and status for each wheel (`FL`, `FR`, `ML`, `MR`, `RL`, `RR`).

### Robotic Arm (IGUS Rebel 6DOF)

- **Hardware**: IGUS Rebel 6DOF or custom manipulator
- **Connection**: Driven by a ROS 2 `joint_state_publisher` and an arm controller node. Must publish to `/arm/joint_states`.
- **Configuration**: The dashboard reads standard `sensor_msgs/msg/JointState` messages to render UI graphs and poses.

### Drill Assembly

- **Hardware**: DC motors, Linear Actuator (TC24-300-1000), Omron Limit Switches (SS-01D)
- **Connection**: Driven by a custom microcontroller script (e.g. ROS 2 `micro_ros` node) publishing to `/drill/status`.
- **Configuration**: The dashboard expects a JSON string mapping the `DrillData` interface.

### Scientific Payload (pH, Pumps, Scales, Spectrometer)

- **Hardware**: DFRobot Gravity Analog pH Sensor, Peristaltic Pumps, Load Cells, Raman Spectrometer
- **Connection**: Controlled by a dedicated ROS payload node which publishes a mapped JSON string to `/science/status`.
- **Commands**: The dashboard issues commands to `/drill/command` for payload actuation (e.g., `pump_on`, `raman_scan`).

### Environmental Sensors

- **Hardware**: Teensy-based multi-sensor array (BME280, DHT22, MQ-135, etc.)
- **Connection**: Publishes serial data over USB to a ROS 2 translation node which broadcasts a JSON string to `/environment/sensors`.

### Cameras (Microscope, Drill, Arm, Fwd)

- **Hardware**: Logitech Brio (Drill), Intel RealSense D435i (Arm/Fwd), generic USB Microscope.
- **Connection**: Streamed over HTTP using `mjpeg-streamer` or `WebRTC`.
- **Configuration**: Use the **Settings** menu inside the dashboard to manually paste the `http://YOUR_ROVER_IP:PORT/stream.mjpg` URLs over each designated camera feed slot (e.g., for the Microscope Optics Feed).

---

## 18. Relay API and health checking

The relay exposes a small HTTP interface.

### `GET /health`

Use this to check the relay status:

```bash
curl http://192.168.1.20:9393/health
```

Example response:

```json
{
  "ok": true,
  "upstreamStatus": "connected",
  "upstreamUrl": "ws://192.168.1.50:9090",
  "clients": 4,
  "subscriptions": [
    {
      "topic": "/imu/data",
      "messageType": "sensor_msgs/msg/Imu",
      "throttleMs": 100,
      "consumers": 4
    }
  ],
  "lastError": null
}
```

### `GET /stream?clientId=...`

- SSE stream for telemetry/status to browsers

### `POST /subscribe`

- browser tells relay which ROS topics it wants

### `POST /publish`

- browser sends commands to relay
- relay forwards commands upstream to the rover

### `POST /disconnect`

- browser informs relay that a client is leaving

### Relay connectivity test sequence

#### 1. Start relay

```bash
ROS_RELAY_UPSTREAM=ws://192.168.1.50:9090 npm run relay
```

#### 2. Check health

```bash
curl http://127.0.0.1:9393/health
```

#### 3. Verify browser client count increases

Open dashboard clients and run:

```bash
curl http://127.0.0.1:9393/health
```

The `clients` value should increase as clients attach.

---

## 19. Camera feed notes

### Important current behavior

The dashboard currently uses `state.cameras` mainly for:

- camera names
- camera status
- feed metadata
- panel layout

### Important limitation

The current camera system is not a full ROS image renderer in the browser.

For real local camera viewing, the best approach is:

- use ROS topics for metadata/status
- use browser-consumable video streams for actual pixels

Typical choices:

1. MJPEG via `web_video_server`
2. WebRTC gateway
3. HLS stream where a little latency is acceptable

### Recommended pattern

Use ROS to publish a camera catalog like this:

```json
[
  {"id":"cam1","name":"Front Cam","url":"http://video-host/front.mjpeg","status":"online"},
  {"id":"cam2","name":"Drill Cam","url":"http://video-host/drill.mjpeg","status":"online"},
  {"id":"cam3","name":"Arm Cam","url":"http://video-host/arm.mjpeg","status":"online"}
]
```

The dashboard now subscribes to this by default on:

```text
/camera/catalog
```

using:

```text
std_msgs/msg/String
```

### How to add camera feeds from ROS to the dashboard

1. Make sure the dashboard is connected to your rover ROS bridge or relay.
2. Publish a camera catalog on `/camera/catalog`.
3. Send the catalog as a JSON array inside `std_msgs/msg/String.data`.
4. Put a browser-usable stream URL in each `url` field.
5. The dashboard will automatically populate `state.cameras` from that topic.

Example publish command:

```bash
ros2 topic pub --once /camera/catalog std_msgs/msg/String '{data: "[{\"id\":\"cam1\",\"name\":\"Front Cam\",\"url\":\"http://192.168.1.50:8080/stream?topic=/front/image_raw\",\"status\":\"online\"},{\"id\":\"cam2\",\"name\":\"Arm Cam\",\"url\":\"http://192.168.1.50:8080/stream?topic=/arm/image_raw\",\"status\":\"online\"}]"}'
```

Notes:

- `url` must be something the browser can open
- raw ROS image topics are not rendered directly in the browser by this dashboard
- typical working URLs come from `web_video_server`, a WebRTC gateway, or HLS output
- if your rover uses a different catalog topic name, edit `src/config/rosTopics.ts`

### How to add camera feeds that are not supported in ROS

Use this path when:

- the feed is not being published into ROS
- the feed comes from an IP camera, DVR/NVR, USB capture host, or external stream service
- the camera exists in ROS but you want to override it with a different browser-ready URL

Steps:

1. Open the dashboard.
2. Click the settings gear.
3. Find the `Camera Feed URLs` section.
4. Paste a browser-usable URL for each camera.
5. Click `Save Camera URLs`.

Supported practical formats include:

- MJPEG HTTP stream
- WebRTC gateway page/endpoint
- HLS URL when latency is acceptable
- any other direct browser-consumable image/video URL your deployment supports

Important behavior:

- saved camera URLs in the settings modal act as manual overrides
- manual overrides take priority over the ROS camera catalog
- to return to ROS-driven camera URLs, clear the saved field and save again

### Recommended architecture

Best practice for this dashboard is:

1. ROS publishes camera metadata and feed catalog information
2. a video gateway provides browser-ready URLs
3. the dashboard renders those gateway URLs

That gives you the flexibility to support both:

- cameras managed through ROS
- cameras that live completely outside ROS

### Example ROS node that publishes `/camera/catalog`

Example ROS 2 Jazzy Python publisher:

```python
#!/usr/bin/env python3
import json
import rclpy
from rclpy.node import Node
from rclpy.qos import DurabilityPolicy, HistoryPolicy, QoSProfile, ReliabilityPolicy
from std_msgs.msg import String

class CameraCatalogPublisher(Node):
    def __init__(self):
        super().__init__('camera_catalog_publisher')
        qos = QoSProfile(
            history=HistoryPolicy.KEEP_LAST,
            depth=1,
            reliability=ReliabilityPolicy.RELIABLE,
            durability=DurabilityPolicy.TRANSIENT_LOCAL,
        )
        self.publisher = self.create_publisher(String, '/camera/catalog', qos)
        self.timer = self.create_timer(1.0, self.publish_catalog)

    def publish_catalog(self):
        catalog = [
            {"id": "cam1", "name": "Front Cam", "url": "http://192.168.1.50:8080/stream?topic=/front/image_raw", "status": "online"},
            {"id": "cam2", "name": "Arm Cam", "url": "http://192.168.1.50:8080/stream?topic=/arm/image_raw", "status": "online"},
            {"id": "cam3", "name": "Drill Cam", "url": "http://192.168.1.50:8080/stream?topic=/drill/image_raw", "status": "online"},
        ]
        self.publisher.publish(String(data=json.dumps(catalog)))

rclpy.init()
node = CameraCatalogPublisher()
rclpy.spin(node)
```

Behavior:

- `TRANSIENT_LOCAL` lets new dashboard clients receive the latest catalog immediately
- update the `url` values to match your rover IP and actual video gateway URLs
- you can publish this once at startup or continuously whenever the camera list changes

### Example `web_video_server` setup for ROS camera topics

If your camera images already exist in ROS, a practical path is to expose them through `web_video_server`.

Example install for ROS 2 Jazzy:

```bash
sudo apt install ros-jazzy-web-video-server
```

Example run command:

```bash
ros2 run web_video_server web_video_server
```

Example browser-usable feed URLs:

```text
http://ROVER_IP:8080/stream?topic=/front/image_raw
http://ROVER_IP:8080/stream?topic=/arm/image_raw
http://ROVER_IP:8080/stream?topic=/drill/image_raw
```

Then either:

1. publish those URLs inside `/camera/catalog`, or
2. paste them manually into the dashboard settings modal under `Camera Feed URLs`

Recommended workflow:

1. start `rosbridge_server`
2. start `web_video_server`
3. verify each stream URL opens in a browser
4. publish the matching URLs on `/camera/catalog`
5. connect the dashboard and confirm the feeds render

---

## 20. Daily startup checklist

Use this exact checklist before operations.

### Rover side

1. power rover systems
2. verify ROS master / ROS graph is healthy
3. start `rosbridge_server`
4. confirm required telemetry topics are publishing

### Workstation side

1. connect workstation to rover/LAN network
2. open project directory
3. start relay:

```bash
ROS_RELAY_UPSTREAM=ws://ROVER_IP:9090 npm run relay
```

4. start dashboard server:

```bash
npm run dev
```

or:

```bash
npm run build
npm run preview
```

5. open local browser on workstation
6. log in
7. connect to relay URL
8. verify `LIVE`
9. verify `curl http://WORKSTATION_IP:9393/health`

### Operator devices

1. open workstation dashboard URL
2. log in if needed
3. connect to workstation relay URL
4. open assigned page
5. verify data is live

---

## 21. Daily shutdown checklist

1. stop active rover operations
2. ensure operators are finished sending commands
3. close browser clients if desired
4. stop dashboard server on workstation
5. stop relay server on workstation
6. stop rover-side `rosbridge_server` if appropriate
7. power down hardware according to rover procedures

---

## 22. Troubleshooting

### Problem: dashboard says `connected` but stays in `SIM`

Possible causes:

- relay is up, but rover topics are not publishing
- topic names in `src/config/rosTopics.ts` do not match rover topics
- message types are incorrect
- `transform` returns `undefined`
- the relay is connected, but not receiving relevant data

What to check:

```bash
curl http://WORKSTATION_IP:9393/health
ros2 topic list
ros2 topic echo /imu/data
ros2 topic echo /localization/pose
```

### Problem: remote device cannot open the dashboard

Possible causes:

- workstation web server not running
- using `localhost` instead of workstation IP
- firewall blocking port `5173` or `4173`
- device is not on the same network

### Problem: remote device opens dashboard but cannot connect to relay

Possible causes:

- relay not running
- using wrong relay URL
- firewall blocking port `9393`

Check:

```bash
curl http://WORKSTATION_IP:9393/health
```

### Problem: too many rover connections still appear

Most likely cause:

- one or more operator browsers connected directly to `ws://ROVER_IP:9090`

Fix:

- make all operators reconnect using `http://WORKSTATION_IP:9393`

### Problem: `npm run build` succeeded but other devices cannot open the app

Reason:

- `npm run build` only creates files
- it does not serve the site

Fix:

```bash
npm run preview
```

or just use:

```bash
npm run dev
```

### Problem: camera panels show labels but no real live video

Reason:

- current implementation mostly handles metadata/layout unless actual browser-viewable stream URLs are wired in

### Problem: login keeps asking again on the same machine

Check whether:

- browser local storage is being cleared
- user clicked Logout
- browser is in a mode that clears storage automatically

### Problem: relay health shows `disconnected`

Possible causes:

- rover `rosbridge_server` is not running
- rover IP is wrong
- rover network is unreachable

---

## 23. Quick command reference

### Install

```bash
npm install
```

### Start dashboard in dev mode

```bash
npm run dev
```

### Build local static assets

```bash
npm run build
```

### Serve built assets locally

```bash
npm run preview
```

### Start relay to rover

```bash
ROS_RELAY_UPSTREAM=ws://ROVER_IP:9090 npm run relay
```

### Check relay health

```bash
curl http://WORKSTATION_IP:9393/health
```

### Source ROS Jazzy environment

```bash
source /opt/ros/jazzy/setup.bash
```

### ROS Jazzy rosbridge launch

```bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml port:=9090
```

---

## Final operational summary

If you want the workstation to be the **main and only rover connection**, the correct pattern is:

1. rover runs `rosbridge_server`
2. workstation runs `npm run relay`
3. workstation runs `npm run dev` or `npm run preview`
4. every department device opens the dashboard from the workstation IP
5. every department device connects to the workstation relay URL
6. no department device connects directly to the rover WebSocket URL

If you follow that pattern, the rover sees one upstream ROS client while the full control room still gets live data.

---
## 24. Lab Operations & Bench Testing Layout

Before any field deployment or public unveiling, it is critical to perform component-level validation in a controlled laboratory environment. The "Lab Layout" is optimized for access, debugging, and iterative hardware calibration.

### 24.1 Lab Physical Layout
**Setup Type**: Bench-Top Configuration
- **Workstation**: Primary development machine with dual monitors.
- **Rover Position**: On a secure mechanical stand (wheels off the ground).
- **Network**: Wired Ethernet (via local switch) for the workstation-to-relay path to eliminate wireless latency variables during debugging.

### 24.2 Operational Goals
- **Smoke Testing**: Validating that all ROS topics are publishing without jitter.
- **Instrument Calibration**: Zeroing the robotic arm, testing the drill depth in a sandbox, and verifying sensor offsets for pH and environmental metrics.
- **Stress Testing**: Running the dashboard for 12+ hours to ensure memory stability and WebSocket reconnection longevity.

---

## 25. Mission Control Center (MCC) Setup Guide: Audimax Hall Case Study

> [!IMPORTANT]
> **Mandatory Prerequisite**: The public unveiling at **Haus H (Audimax)** is a high-stakes operational demonstration. This professional layout should ONLY be commissioned after **extensive lab testing** (minimum 20 hours of verified uptime). Field failures in front of an audience are preventable through rigorous pre-mission lab validation.

To achieve true mission-grade performance during the project's public unveiling, the physical layout of the **Haus H (Audimax) at Hochschule Schmalkalden** is engineered for optimal situational awareness. The hall's steep **tiered seating** and clear **3-column architecture** provide the ideal geometry for a high-intensity control room.

### 25.1 The Command Wall (Central Intelligence)
**Hardware**: Audimax High-Gain Center Projector
**URL**: `http://WORKSTATION_IP:5173/#mission`

![The High-Level Mission Overview](SS/mission-control.png?raw=true)

The Command Wall is the singular source of truth for the entire room.
- **The Setup**: The primary hall projector stays locked on the `#mission` route. This displays the 3D attitude gauges, global mapping, and the primary camera matrix.
- **Why**: In high-intensity operations, "siloed" information leads to failure. Having a centralized display ensures that the Mission Lead (on the floor) and all department operators are looking at synchronized data.

### 25.2 The Flight Pits (The Three Operational Wings)
The first row of seating in the Audimax is divided into three distinct **Wings**, each housing specific HSM Aries departments.

#### Left Wing: Astro & Navigation
**Departments**: Astroflight, Software & Navigation, Communication 
- **Focus**: Real-time rover piloting, pathfinding, and signal link health.
- **Screenshots**:
  ![Pilot Control Interface](SS/manual-driving.png?raw=true)
  ![Camera Manifest Grid](SS/cameras.png?raw=true)
- **Why**: Positioned on the left flank to mimic standard cockpit ergonomics. Having low-latency camera feeds directly adjacent to the steering vectors allows the pilot to make split-second navigational decisions without diverting focus.

#### Center Wing: Mission Alpha (The Gatekeeper)
**Departments**: Mission, Resources & Outreach, Mechanical
- **Focus**: Global mission coordination, access control, and structural oversight.
- **Screenshots**:
  ![System Login](SS/loginscreen.png?raw=true)
  ![Splash/Boot Sequence](SS/intialsplash.png?raw=true)
  ![System Lock](SS/lockscreen.png?raw=true)
  ![Global Configuration](SS/settings.png?raw=true)
- **Why**: The Mission Lead is stationed here in the center column to provide the shortest physical path for managing global system states (Login/Settings) and performing hardware-level mechanical audits.

#### Right Wing: Science & Systems
**Departments**: Scientific Payload, Drill & Manipulator, Electrical
- **Focus**: Environmental analysis, specimen retrieval, and power telemetry.
- **Screenshots**:
  ![Science Operations Display](SS/science.png?raw=true)
  ![Drill Control & Status](SS/drill-ops.png?raw=true)
  ![Robotic Arm Interface](SS/robotic-arm.png?raw=true)
  ![Electrical Power Grid](SS/electrical.png?raw=true)
  ![Subsystem Telemetry Detail](SS/telemetry-detail.png?raw=true)
- **Why**: Placed on the right flank to separate "Subsystem Health" and "Research" from "Navigational Control." This ensures that power-critical warnings or scientific data spikes do not distract the pilot's line of sight during maneuvers.

### 25.3 The Sterile Zone (Cognitive Load Management)
**Constraint**: Spectators must be seated **beginning from Row 4**.

- **The Setup**: Rows 1-3 act as a "Sterile Zone." Operators in Row 1 have three empty rows behind them before the public seating begins.
- **The "Why"**: Professional mission environments require a "total immersion" state. By creating a 3-row physical buffer, we prevent spectators from accidentally bumping operator laptops or causing auditory distractions. This "Stage-Pit" separation maintains the authority of the mission staff and allows for clear verbal communication across the operator line.

### 25.4 The Network Bridge (Ubiquiti RF Propagation)
**Rover Position**: Sportanlagen (Football Field)
**Bridge Location**: Haus H Exterior (Balcony/Uplink)

- **The Setup**: A high-gain **Ubiquiti WiFi Bridge** (airMAX or UniFi Building Bridge) is required to span the line-of-sight distance between **Haus H** and the **Sportanlagen**.
- **The "Why"**: Large university buildings act as **Faraday cages**, severely attenuating internal Wi-Fi signals. By placing the bridge *outside* the building and establishing a dedicated 5GHz path, we bypass building interference and ensure a low-latency 100Mbps+ pipe—critical for teleop control.

### 25.5 Operational Atmosphere (The Pro Config)
- **Lighting**: Dimmable blue or "Red Alert" lighting is recommended.
- **Why**: Reduces eye fatigue and eliminates screen glare on the projector, ensuring that the high-contrast dashboard UI remains perfectly legible from the back of the hall.
- **Comms**: Operators should utilize a shared "Comms Loop" via wired headsets.
- **Why**: Isolates operational chatter from the ambient noise of the crowd, ensuring critical commands are never missed.

---
## 26. Mission Data Logging & High-Fidelity Capture

To support deep-dive mission forensics and research-grade analysis, the Aries Mission Control system incorporates a high-fidelity data logging engine.

### 26.1 10Hz Sampling Strategy
All core telemetry—including odometry, orientation, subsystem status, and environmental metrics—is captured at a uniform **10Hz (100ms)** rate. This represents a 5x to 10x increase in data density over traditional 1Hz monitoring, ensuring that every transient event or anomaly is recorded.

### 26.2 Mission Log Export (.lp1 & .csv)
Operators can initiate mission-wide data logging from the dashboard. The system supports two primary export formats:
- **.csv**: Standard tabular data for spreadsheet-based analysis.
- **.lp1 (LeapOne Mission File)**: A high-fidelity, binary mission log format featuring integrated security and integrity checks (CRC-32). This is the recommended format for archiving and reloading missions in the Data Analyser.

**Key logged parameters include**:
- Timestamp (Unix MS)
- Relative X, Y, Z Coordinates
- Pitch, Roll, Yaw, and Heading
- Battery Voltage and SoC
- Subsystem Status (Drive, Arm, Drill, Science)

### 26.3 Post-Mission Analytics
The **Mission Data Analyser** (`#analysis`) allows these logs to be reloaded for high-fidelity replay.

- **Activity Highlighting**: The timeline scrubber automatically scans for mission milestones:
  - **Drill Active (Cyan)**: Periods where the drill was actively penetrating or retracting from the substrate.
  - **Arm Active (Purple)**: Periods where the manipulator was in motion.
- **Trajectory Interpolation**: The map view reconstructs the physical path taken by the rover, allowing scientists to correlate environmental discoveries with specific geographical waypoints.

### 26.4 Science Auto-Logger
On the **Science Ops** page, a dedicated environmental logger records air and soil metrics at 10Hz. This data is designed for high-resolution trend analysis of CO₂, Humidity, and Pressure during site-specific sampling.

---
## License & Copyright

**Proprietary and Confidential**

This repository and all its contents are the exclusive property of **Hochschule Schmalkalden** and the **HSM Aries Space Team**. 

This is **NOT open source software**. 

All rights are reserved. You may not copy, modify, distribute, publish, transmit, or reproduce any part of this software, its source code, or its design assets without explicit, prior written permission from the project owners. Unauthorized copying of these files, via any medium, is strictly prohibited.

