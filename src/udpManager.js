/* eslint-disable no-param-reassign */
const dgram = require('dgram');
const debugUdp = require('debug')('UDP');

debugUdp.enabled = true;

const setupUdpPort = (port, schema, io) =>
  new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    let seq = 0;

    socket.once('error', (err) => {
      debugUdp(`error on ${port}`, err.message);
      socket.close();
      resolve(null);
    });

    socket.on('listening', () => {
      const { address } = socket.address();
      debugUdp(`listening on ${address}:${port}`);
      socket.removeAllListeners('error');
      socket.on('error', (err) => {
        debugUdp(`error on ${port}`, err.message);
      });
      resolve(socket);
    });

    socket.on('message', (buffer, rinfo) => {
      const message = buffer.toString().replace(/[\r\n]+$/, '');
      seq += 1;
      debugUdp(`data received on ${port} from ${rinfo.address}`, message);

      for (const room in schema) {
        if (Object.prototype.hasOwnProperty.call(schema, room)) {
          if (!schema[room].udpData) {
            schema[room].udpData = {};
          }
          schema[room].udpData[port] = {
            message,
            from: rinfo.address,
            seq,
          };
          io.to(room).emit('schema', schema[room]);
        }
      }
    });

    socket.bind(port, '0.0.0.0');
  });

const parsePort = (entry) => {
  const trimmed = entry.trim();
  const port = Number(trimmed);
  if (/^\d{1,5}$/.test(trimmed) && port >= 1 && port <= 65535) {
    return port;
  }
  debugUdp(`ignoring invalid port "${entry}"`);
  return null;
};

const setupUdp = (schema, io, ports) =>
  Promise.all(
    ports
      .map(parsePort)
      .filter((port) => port !== null)
      .map((port) => setupUdpPort(port, schema, io)),
  ).then((sockets) => sockets.filter(Boolean));

module.exports = {
  setupUdp,
};
