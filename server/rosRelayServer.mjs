import { createServer } from 'node:http';
import * as ROSLIB from 'roslib';

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
};

const cli = parseArgs(process.argv.slice(2));
const upstreamUrl = cli.upstream || process.env.ROS_RELAY_UPSTREAM || 'ws://localhost:9090';
const listenHost = cli.host || process.env.ROS_RELAY_HOST || '0.0.0.0';
const listenPort = Number(cli.port || process.env.ROS_RELAY_PORT || 9393);

const clients = new Map();
const subscriptions = new Map();
const publishers = new Map();

let ros = null;
let upstreamStatus = 'disconnected';
let reconnectAttempt = 0;
let reconnectTimer = null;
let lastError = null;

const topicKey = (topic, messageType) => `${topic}::${messageType}`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', ...cors });
  res.end(JSON.stringify(payload));
};

const readJson = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
};

const sseWrite = (res, event, payload) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const getClient = (clientId) => {
  let client = clients.get(clientId);
  if (!client) {
    client = { id: clientId, res: null, subscriptions: new Set(), cleanupTimer: null };
    clients.set(clientId, client);
  }
  if (client.cleanupTimer) {
    clearTimeout(client.cleanupTimer);
    client.cleanupTimer = null;
  }
  return client;
};

const broadcastStatus = () => {
  const payload = {
    upstreamStatus,
    upstreamUrl,
    lastError,
    clientCount: clients.size,
    subscriptionCount: subscriptions.size,
  };
  for (const client of clients.values()) {
    if (client.res) sseWrite(client.res, 'status', payload);
  }
};

const clearTopicHandles = () => {
  publishers.clear();
  for (const entry of subscriptions.values()) {
    if (entry.handle) {
      try { entry.handle.unsubscribe(); } catch { /* noop */ }
      entry.handle = null;
    }
  }
};

const broadcastTopic = (key, topic, message) => {
  for (const client of clients.values()) {
    if (client.res && client.subscriptions.has(key)) {
      sseWrite(client.res, 'topic', { topic, message });
    }
  }
};

const ensureSubscriptionHandle = (entry) => {
  if (!ros || upstreamStatus !== 'connected') return;
  if (entry.handle) {
    try { entry.handle.unsubscribe(); } catch { /* noop */ }
  }

  const handle = new ROSLIB.Topic({
    ros,
    name: entry.topic,
    messageType: entry.messageType,
    throttle_rate: entry.throttleMs,
  });

  handle.subscribe((message) => {
    broadcastTopic(entry.key, entry.topic, message);
  });

  entry.handle = handle;
  console.log(`[relay] subscribed upstream ${entry.topic} (${entry.messageType}) throttle=${entry.throttleMs}ms`);
};

const refreshSubscription = (entry) => {
  if (entry.requestedBy.size === 0) {
    if (entry.handle) {
      try { entry.handle.unsubscribe(); } catch { /* noop */ }
    }
    subscriptions.delete(entry.key);
    return;
  }

  const nextThrottle = Math.min(...entry.requestedBy.values());
  const changed = entry.throttleMs !== nextThrottle;
  entry.throttleMs = nextThrottle;
  if (changed || !entry.handle) ensureSubscriptionHandle(entry);
};

const removeClient = (clientId) => {
  const client = clients.get(clientId);
  if (!client) return;

  for (const key of client.subscriptions) {
    const entry = subscriptions.get(key);
    if (!entry) continue;
    entry.requestedBy.delete(clientId);
    refreshSubscription(entry);
  }

  if (client.cleanupTimer) clearTimeout(client.cleanupTimer);
  if (client.res) {
    try { client.res.end(); } catch { /* noop */ }
  }
  clients.delete(clientId);
  broadcastStatus();
};

const scheduleReconnect = () => {
  if (reconnectTimer) return;
  const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempt), 15000);
  reconnectTimer = setTimeout(() => {
    reconnectAttempt += 1;
    reconnectTimer = null;
    connectUpstream();
  }, delay);
  console.log(`[relay] reconnecting to rover in ${(delay / 1000).toFixed(1)}s`);
};

const connectUpstream = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  upstreamStatus = 'connecting';
  lastError = null;
  broadcastStatus();

  const connection = new ROSLIB.Ros({ url: upstreamUrl });
  ros = connection;

  connection.on('connection', () => {
    if (ros !== connection) return;
    upstreamStatus = 'connected';
    reconnectAttempt = 0;
    lastError = null;
    console.log(`[relay] connected upstream ${upstreamUrl}`);
    broadcastStatus();
    for (const entry of subscriptions.values()) ensureSubscriptionHandle(entry);
  });

  connection.on('error', (error) => {
    if (ros !== connection) return;
    upstreamStatus = 'error';
    lastError = error instanceof Error ? error.message : String(error);
    console.error('[relay] upstream error:', lastError);
    broadcastStatus();
  });

  connection.on('close', () => {
    if (ros !== connection) return;
    console.warn('[relay] upstream connection closed');
    upstreamStatus = 'disconnected';
    ros = null;
    clearTopicHandles();
    broadcastStatus();
    scheduleReconnect();
  });
};

const keepAlive = setInterval(() => {
  for (const client of clients.values()) {
    if (client.res) client.res.write(': keep-alive\n\n');
  }
}, 15000);

const server = createServer(async (req, res) => {
  if (!req.url) return sendJson(res, 400, { ok: false, error: 'Missing request URL' });
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, {
      ok: true,
      upstreamStatus,
      upstreamUrl,
      clients: clients.size,
      subscriptions: Array.from(subscriptions.values()).map((entry) => ({
        topic: entry.topic,
        messageType: entry.messageType,
        throttleMs: entry.throttleMs,
        consumers: entry.requestedBy.size,
      })),
      lastError,
    });
  }

  if (req.method === 'GET' && url.pathname === '/stream') {
    const clientId = url.searchParams.get('clientId');
    if (!clientId) return sendJson(res, 400, { ok: false, error: 'clientId is required' });

    const client = getClient(clientId);
    if (client.res && client.res !== res) {
      try { client.res.end(); } catch { /* noop */ }
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      ...cors,
    });

    client.res = res;
    sseWrite(res, 'status', { upstreamStatus, upstreamUrl, lastError });

    req.on('close', () => {
      const current = clients.get(clientId);
      if (!current || current.res !== res) return;
      current.res = null;
      current.cleanupTimer = setTimeout(() => removeClient(clientId), 30000);
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/subscribe') {
    const body = await readJson(req);
    const clientId = body.clientId;
    const requested = Array.isArray(body.subscriptions) ? body.subscriptions : [];
    if (!clientId) return sendJson(res, 400, { ok: false, error: 'clientId is required' });

    const client = getClient(clientId);
    for (const sub of requested) {
      if (!sub?.topic || !sub?.messageType) continue;
      const key = topicKey(sub.topic, sub.messageType);
      client.subscriptions.add(key);

      let entry = subscriptions.get(key);
      if (!entry) {
        entry = {
          key,
          topic: sub.topic,
          messageType: sub.messageType,
          throttleMs: sub.throttleMs ?? 100,
          requestedBy: new Map(),
          handle: null,
        };
        subscriptions.set(key, entry);
      }

      entry.requestedBy.set(clientId, sub.throttleMs ?? 100);
      refreshSubscription(entry);
    }

    broadcastStatus();
    return sendJson(res, 200, { ok: true, subscriptions: client.subscriptions.size });
  }

  if (req.method === 'POST' && url.pathname === '/disconnect') {
    const body = await readJson(req);
    if (body.clientId) removeClient(body.clientId);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/publish') {
    const body = await readJson(req);
    const { topic, messageType, payload } = body;
    if (!topic || !messageType) return sendJson(res, 400, { ok: false, error: 'topic and messageType are required' });
    if (!ros || upstreamStatus !== 'connected') {
      return sendJson(res, 503, { ok: false, error: 'Relay is not connected to the rover' });
    }

    const key = topicKey(topic, messageType);
    let publisher = publishers.get(key);
    if (!publisher) {
      publisher = new ROSLIB.Topic({ ros, name: topic, messageType });
      publishers.set(key, publisher);
    }

    try {
      publisher.publish(payload);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return sendJson(res, 500, { ok: false, error: message });
    }
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' });
});

server.listen(listenPort, listenHost, () => {
  console.log(`[relay] listening on http://${listenHost}:${listenPort}`);
  console.log(`[relay] upstream target ${upstreamUrl}`);
  connectUpstream();
});

const shutdown = () => {
  clearInterval(keepAlive);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  clearTopicHandles();
  for (const client of clients.values()) {
    if (client.cleanupTimer) clearTimeout(client.cleanupTimer);
    if (client.res) {
      try { client.res.end(); } catch { /* noop */ }
    }
  }
  if (ros) {
    try { ros.close(); } catch { /* noop */ }
  }
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);