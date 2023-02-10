const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { networkInterfaces } = require('os');
const { Bonjour } = require('bonjour-service');

const server = http.createServer();
const serverHttps = https.createServer({
  key: fs.readFileSync(path.join(__dirname, 'certs/privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/fullchain.pem')),
});
const { Server } = require('socket.io');

const debugServer = require('debug')('SERVER');
const debugClient = require('debug')('CLIENT');
const debugBonjour = require('debug')('BONJOUR');
const jsondiffpatch = require('jsondiffpatch').create();

const NUMERIC_DIFFERENCE = -8;
const PORT = process.env.PORT || 3000;
const PORT_HTTPS = process.env.PORT_HTTPS || 3443;

debugServer.enabled = true;

// Configure numeric filter for jsonpatch
const numericPatchFilter = (context) => {
  if (context.delta && Array.isArray(context.delta) && context.delta[2] === NUMERIC_DIFFERENCE) {
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
io.attach(serverHttps);

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
serverHttps.listen(PORT_HTTPS);

const printAdressesFromInterfaces = () => {
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        debugServer(`listening on ws://${net.address}:${PORT}`);
      }
    }
  }
  debugServer(`listening on wss://shared-schema.panda.st:${PORT_HTTPS}`);
};

const advertiseServer = () => {
  const instance = new Bonjour(undefined, (e) => {
    if (e) {
      debugBonjour('error', e);
    }
  });
  instance.publish({ name: 'PandaSuite Shared Schema', type: 'http', port: PORT });
  instance.publish({ name: 'PandaSuite Shared Schema', type: 'https', port: PORT_HTTPS });
};

printAdressesFromInterfaces();
advertiseServer();
