const { test } = require('node:test');
const assert = require('node:assert/strict');
const dgram = require('node:dgram');

const { setupUdp } = require('../src/udpManager');

const fakeIo = (emitted) => ({
  to: (room) => ({
    emit: (event, payload) => emitted.push({ room, event, payload }),
  }),
});

const send = (port, text) =>
  new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    client.send(Buffer.from(text), port, '127.0.0.1', (err) => {
      client.close();
      if (err) reject(err);
      else resolve();
    });
  });

const nextEmit = (emitted, count) =>
  new Promise((resolve) => {
    const check = () => {
      if (emitted.length >= count) resolve();
      else setTimeout(check, 5);
    };
    check();
  });

test('a datagram lands in every room and a repeat is still a change', async () => {
  const schema = { roomA: {}, roomB: {} };
  const emitted = [];
  const io = fakeIo(emitted);

  const sockets = await setupUdp(schema, io, ['0']);
  const { port } = sockets[0].address();

  await send(port, '1,ON\r\n');
  await nextEmit(emitted, 2);

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

  await send(port, '1,ON');
  await nextEmit(emitted, 4);

  assert.equal(schema.roomA.udpData[port].seq, 2);
  assert.equal(schema.roomA.udpData[port].message, '1,ON');

  sockets.forEach((socket) => socket.close());
});
