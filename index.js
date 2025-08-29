const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { program } = require('commander');

const { networkInterfaces } = require('os');
// const { Bonjour } = require('bonjour-service');

program
  .name('shared-schema')
  .option('-k, --key <file>')
  .option('-c, --cert <file>')
  .option(
    '-s, --serial-inspect [ports]',
    'enable serial port inspection with optional list of ports',
    undefined,
  )
  .option('-d, --delimiter <delimiter>', 'delimiter for serial port data', '\n')
  .option('-t, --tuio [port]', 'enable tuio udp server', 3333)
  .option(
    '--tuio-throttle <ms>',
    'throttle tuio emission rate in milliseconds',
    16,
  )
  .option(
    '--update-certs',
    'download latest SSL certificates from GitHub releases',
  );

program.parse();

let { key: keyPath, cert: certPath } = program.opts();
const { serialInspect, delimiter, tuio, tuioThrottle, updateCerts } =
  program.opts();

const { Server } = require('socket.io');

const debugServer = require('debug')('SERVER');
const debugClient = require('debug')('CLIENT');
// const debugBonjour = require('debug')('BONJOUR');
const jsondiffpatch = require('jsondiffpatch').create();

const {
  downloadCertificates,
  getCertsDirectory,
} = require('./src/certManager');
const { setupSerialPorts } = require('./src/serialManager');
const { setupTuio } = require('./src/tuioManager');

// Handle certificate update command
if (updateCerts) {
  downloadCertificates().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

// Set default certificate paths
if (!keyPath) {
  keyPath = path.join(getCertsDirectory(), 'privkey.pem');
} else {
  keyPath = path.resolve(keyPath);
}

if (!certPath) {
  certPath = path.join(getCertsDirectory(), 'fullchain.pem');
} else {
  certPath = path.resolve(certPath);
}

// Create HTTP and HTTPS servers
const server = http.createServer();
let serverHttps;
let cert;

try {
  cert = new crypto.X509Certificate(fs.readFileSync(certPath));
  serverHttps = https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  });
} catch (error) {
  debugServer('⚠️ SSL certificates not found or invalid');
  debugServer('💡 Run with --update-certs to download fresh certificates');
  serverHttps = null;
}

const NUMERIC_DIFFERENCE = -8;
const PORT = process.env.PORT || 3000;
const PORT_HTTPS = process.env.PORT_HTTPS || 3443;

debugServer.enabled = true;
debugClient.enabled = true;

if (cert && Date.parse(cert.validTo) < Date.now()) {
  debugServer('⚠️ Certificate is not valid anymore ⚠️ ');
  serverHttps = null;
}

// Configure numeric filter for jsonpatch
const numericPatchFilter = (context) => {
  if (
    context.delta &&
    Array.isArray(context.delta) &&
    context.delta[2] === NUMERIC_DIFFERENCE
  ) {
    context.setResult(context.left + context.delta[1]).exit();
  }
};
numericPatchFilter.filterName = 'numeric';
jsondiffpatch.processor.pipes.patch.before('trivial', numericPatchFilter);

const schema = {};

const io = new Server({
  path: '/',
  cors: {
    origin: '*',
  },
});

io.attach(server);
if (serverHttps) {
  io.attach(serverHttps);
}

io.on('connection', (socket) => {
  const { room } = socket.handshake.query;

  debugClient('connected', `socketId: ${socket.id} room: ${room}`);
  if (!schema[room]) {
    schema[room] = {};
  }

  socket.join(room);
  socket.emit('schema', schema[room]);

  socket.on('schema', (arg) => {
    debugClient('patch schema', arg);
    try {
      jsondiffpatch.patch(schema[room], arg);
      debugClient('new schema', schema[room]);
      io.to(room).emit('schema', schema[room]);
    } catch (error) {
      debugClient('error', error);
    }
  });

  socket.on('disconnect', (reason) => {
    debugClient('disconnected', `socketId: ${socket.id} ${reason}`);
  });
});

server.listen(PORT);
if (serverHttps) {
  serverHttps.listen(PORT_HTTPS);
}

const printAdressesFromInterfaces = () => {
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        debugServer(`listening on ws://${net.address}:${PORT}`);
      }
    }
  }
  if (serverHttps && cert) {
    debugServer(
      `listening on wss://${cert.subject.replace('CN=', '')}:${PORT_HTTPS}`,
    );
  } else if (serverHttps) {
    debugServer(`listening on wss://localhost:${PORT_HTTPS}`);
  }
};

// const advertiseServer = () => {
//   const instance = new Bonjour(undefined, (e) => {
//     if (e) {
//       debugBonjour('error', e);
//     }
//   });
//   instance.publish({
//     name: 'PandaSuite Shared Schema',
//     type: 'http',
//     port: PORT,
//   });
//   if (serverHttps) {
//     instance.publish({
//       name: 'PandaSuite Shared Schema',
//       type: 'https',
//       port: PORT_HTTPS,
//     });
//   }
// };

printAdressesFromInterfaces();
// advertiseServer();

if (serialInspect !== undefined) {
  const ports = serialInspect.split(',');
  setupSerialPorts(schema, io, delimiter, ports);
}

if (tuio !== undefined) {
  setupTuio(schema, io, tuio, { emitThrottleMs: tuioThrottle });
}
