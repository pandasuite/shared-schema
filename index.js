const { createServer } = require('http');

const server = createServer();
const { Server } = require('socket.io');

const debug = require('debug')('shared-schema');
const jsondiffpatch = require('jsondiffpatch').create();

const NUMERIC_DIFFERENCE = -8;

const numericPatchFilter = (context) => {
  if (context.delta && Array.isArray(context.delta) && context.delta[2] === NUMERIC_DIFFERENCE) {
    context.setResult(context.left + context.delta[1]).exit();
  }
};
numericPatchFilter.filterName = 'numeric';
jsondiffpatch.processor.pipes.patch.before('trivial', numericPatchFilter);

const schema = {};

const io = new Server(server, {
  path: '/',
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  const { room } = socket.handshake.query;

  debug('[CLIENT] connected', `socketId: ${socket.id} room: ${room}`);
  if (!schema[room]) {
    schema[room] = {};
  }

  socket.join(room);
  socket.emit('schema', schema[room]);

  socket.on('schema', (arg) => {
    debug('[CLIENT] patch schema', arg);
    try {
      jsondiffpatch.patch(schema[room], arg);
      debug('[CLIENT] new schema', schema[room]);
      io.to(room).emit('schema', schema[room]);
    } catch (error) {
      debug('[CLIENT] error', error);
    }
  });

  socket.on('disconnect', (reason) => {
    debug('[CLIENT] disconnected', `socketId: ${socket.id} ${reason}`);
  });
});

io.listen(3000);
