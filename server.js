const { GrpcServerWrapper } = require('./wrapper/wrp-server');
const server = new GrpcServerWrapper();

// Middleware de ejemplo
function loggingMiddleware(call, callback, next) {
  console.log('Petición recibida:', call.request);
  next();
}

server.use(loggingMiddleware);

server.addMethods({
  sayHello: (call, callback) => {
    callback(null, { message: `Hola, ${call.request.name}!` });
  },
});

server.start();
