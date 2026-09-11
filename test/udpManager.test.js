const { test } = require('node:test');
const assert = require('node:assert/strict');
const dgram = require('node:dgram');
const { once } = require('node:events');

const { setupUdp } = require('../src/udpManager');

const fakeIo = (emitted) => ({
  to: (room) => ({
    emit: (event, payload) => emitted.push({ room, event, payload }),
  }),
});

const freePort = async () => {
  const socket = dgram.createSocket('udp4');
  socket.bind(0, '127.0.0.1');
  await once(socket, 'listening');
  const { port } = socket.address();
  socket.close();
  return port;
};

const withUdp = async (schema, io, ports, fn) => {
  const sockets = await setupUdp(schema, io, ports);
  try {
    await fn(sockets);
  } finally {
    sockets.forEach((socket) => socket.close());
  }
};

// Resolves once the manager has handled the datagram: its listener was
// attached before ours, and it emits synchronously.
const sendAndWait = async (socket, port, text) => {
  const handled = once(socket, 'message', {
    signal: AbortSignal.timeout(1000),
  });
  const client = dgram.createSocket('udp4');
  client.send(Buffer.from(text), port, '127.0.0.1', () => client.close());
  await handled;
};

test('a datagram lands in every room, repeats and line breaks', async () => {
  const schema = { roomA: {}, roomB: {} };
  const emitted = [];
  const port = await freePort();

  await withUdp(schema, fakeIo(emitted), [String(port)], async ([socket]) => {
    await sendAndWait(socket, port, '1,ON\r\n');

    assert.deepEqual(schema.roomA.udpData[port], {
      message: '1,ON',
      from: '127.0.0.1',
      seq: 1,
    });
    assert.deepEqual(schema.roomB.udpData[port], schema.roomA.udpData[port]);
    assert.deepEqual(
      emitted.map((e) => [e.room, e.event]),
      [
        ['roomA', 'schema'],
        ['roomB', 'schema'],
      ],
    );
    assert.equal(emitted[0].payload, schema.roomA);

    await sendAndWait(socket, port, '1,ON');
    assert.equal(schema.roomA.udpData[port].seq, 2);
    assert.equal(schema.roomA.udpData[port].message, '1,ON');

    await sendAndWait(socket, port, '1,OFF\r');
    assert.equal(schema.roomA.udpData[port].message, '1,OFF');
  });
});

test('invalid and duplicate port entries are skipped, the valid ones bind', async () => {
  const port = await freePort();

  await withUdp(
    {},
    fakeIo([]),
    ['abc', '', '0', '70000', '1e3', ` ${port} `, String(port)],
    async (sockets) => {
      assert.equal(sockets.length, 1);
      assert.equal(sockets[0].address().port, port);
    },
  );
});
