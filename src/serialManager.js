/* eslint-disable no-param-reassign */
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const debugSerial = require('debug')('SERIAL');

debugSerial.enabled = true;

const activePorts = {};

const setupSerialPort = (portPath, schema, io, delimiter) => {
  debugSerial('setting up port', portPath);
  const port = new SerialPort({ path: portPath, baudRate: 9600, lock: false });
  const parser = port.pipe(new ReadlineParser({ delimiter }));

  parser.on('data', (data) => {
    debugSerial(`data received on ${portPath}`, data);
    for (const room in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, room)) {
        if (!schema[room].serialData) {
          schema[room].serialData = {};
        }
        schema[room].serialData[portPath] = data;
        io.to(room).emit('schema', schema[room]);
      }
    }
  });

  port.on('error', (err) => {
    debugSerial(`error on ${portPath}`, err.message);
  });

  port.on('close', () => {
    debugSerial(`port ${portPath} closed`);
    for (const room in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, room)) {
        if (schema[room].serialData && schema[room].serialData[portPath]) {
          delete schema[room].serialData[portPath];
          io.to(room).emit('schema', schema[room]);
        }
      }
    }
    delete activePorts[portPath];
  });

  activePorts[portPath] = port;
};

const setupSerialPorts = async (schema, io, delimiter, ports) => {
  try {
    ports.forEach((portPath) => {
      if (!activePorts[portPath]) {
        setupSerialPort(portPath, schema, io, delimiter);
      }
    });
  } catch (err) {
    debugSerial('error setting up ports', err.message);
  }
};

module.exports = {
  setupSerialPorts,
};
