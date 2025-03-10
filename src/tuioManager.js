const osc = require('osc');
const debugTuio = require('debug')('TUIO');

const radiansToDegrees = (radians) => radians * (180 / Math.PI);

const updateOrAdd = (list, sessionId, newData) => {
  const index = list.findIndex((item) => item.sessionId === sessionId);

  if (index !== -1) {
    const existingData = list[index];
    let hasChanged = false;

    for (const key in newData) {
      if (
        Object.prototype.hasOwnProperty.call(newData, key) &&
        newData[key] !== existingData[key]
      ) {
        existingData[key] = newData[key];
        hasChanged = true;
      }
    }

    return hasChanged;
  }

  list.push(newData);
  return true;
};

const removeInactive = (list, activeSessionIds) => {
  const initialLength = list.length;
  list.splice(
    0,
    list.length,
    ...list.filter((item) => activeSessionIds.includes(item.sessionId)),
  );
  return list.length !== initialLength;
};

const setupTuio = async (schema, io, port, options = {}) => {
  const tuio = {};
  const emitThrottleMs = options.emitThrottleMs || 16;
  let lastEmitTime = 0;

  debugTuio(`TUIO set up with a throttle of ${emitThrottleMs}ms`);

  try {
    const udpPort = new osc.UDPPort({
      localAddress: '0.0.0.0',
      localPort: port instanceof Number ? port : 3333,
      metadata: true,
    });

    udpPort.on('message', (oscMsg) => {
      const { address, args } = oscMsg;

      if (args.length === 0) return;

      const messageType = args[0]?.value;
      const currentType = address.split('/')[2];

      if (!tuio[currentType]) {
        tuio[currentType] = { data: [], fseq: 0 };
      }

      switch (messageType) {
        case 'alive': {
          const activeSessionIds = args.slice(1).map((arg) => arg.value);
          removeInactive(tuio[currentType].data, activeSessionIds);

          if (tuio[currentType].data.length === 0) {
            delete tuio[currentType];
          }
          break;
        }

        case 'set': {
          const sessionId = args[1].value;
          const classId = currentType.includes('obj')
            ? args[2]?.value || 0
            : undefined;
          const x = args[2 + (classId !== undefined ? 1 : 0)]?.value;
          const y = args[3 + (classId !== undefined ? 1 : 0)]?.value;
          const z = [
            '25Dcur',
            '25Dobj',
            '25Dblb',
            '3Dcur',
            '3Dobj',
            '3Dblb',
          ].includes(currentType)
            ? args[4 + (classId !== undefined ? 1 : 0)]?.value
            : undefined;
          const angleRadians = currentType.includes('obj')
            ? args[5]?.value || 0
            : 0;
          const angleDegrees = radiansToDegrees(angleRadians);

          const velocity = {
            x: args[6 + (classId !== undefined ? 1 : 0)]?.value || 0,
            y: args[7 + (classId !== undefined ? 1 : 0)]?.value || 0,
            ...(currentType.startsWith('3D') && {
              z: args[8 + (classId !== undefined ? 1 : 0)]?.value || 0,
            }),
            angle: args[8 + (classId !== undefined ? 1 : 0)]?.value || 0,
          };

          const acceleration = {
            linear: args[9 + (classId !== undefined ? 1 : 0)]?.value || 0,
            angular: args[10 + (classId !== undefined ? 1 : 0)]?.value || 0,
          };

          const dimensions = currentType.includes('blb')
            ? {
                ...(args[11 + (classId !== undefined ? 1 : 0)] && {
                  width: args[11 + (classId !== undefined ? 1 : 0)].value,
                }),
                ...(args[12 + (classId !== undefined ? 1 : 0)] && {
                  height: args[12 + (classId !== undefined ? 1 : 0)].value,
                }),
                ...(currentType.startsWith('3D') &&
                  args[13 + (classId !== undefined ? 1 : 0)] && {
                    depth: args[13 + (classId !== undefined ? 1 : 0)].value,
                  }),
                ...(args[14 + (classId !== undefined ? 1 : 0)] && {
                  area: args[14 + (classId !== undefined ? 1 : 0)].value,
                }),
              }
            : undefined;

          const newData = {
            sessionId,
            ...(classId !== undefined && { classId }),
            position: {
              type: 'NormPoint',
              value: {
                x,
                y,
              },
            },
            ...(z !== undefined && { z }),
            ...(currentType.includes('obj') && {
              angle: angleDegrees,
            }),
            velocity,
            acceleration,
            ...(dimensions && { dimensions }),
          };

          updateOrAdd(tuio[currentType].data, sessionId, newData);
          break;
        }

        case 'fseq': {
          const frameSequence = args[1].value;
          if (tuio[currentType].fseq !== frameSequence) {
            tuio[currentType].fseq = frameSequence;

            const currentTime = Date.now();
            if (currentTime - lastEmitTime >= emitThrottleMs) {
              for (const room in schema) {
                if (Object.prototype.hasOwnProperty.call(schema, room)) {
                  io.to(room).emit('schema', tuio);
                }
              }
              lastEmitTime = currentTime;
            }
          }
          break;
        }

        default:
          break;
      }
    });

    udpPort.open();
  } catch (err) {
    debugTuio('Error setting up ports:', err.message);
  }
};

module.exports = {
  setupTuio,
};
