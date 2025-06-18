const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const { GrpcServerWrapper } = require('./wrapper/wrp-server');

const config = JSON.parse(fs.readFileSync('./server-config.json', 'utf8'));
const PROTO_PATH = __dirname + '/proto/greeter.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const proto = grpc.loadPackageDefinition(packageDefinition).greeter;

function sayHello(call, callback) {
  callback(null, { message: `Hola, ${call.request.name}!` });
}

// Middleware de ejemplo
function loggingMiddleware(call, callback, next) {
  console.log('Petición recibida:', call.request);
  next();
}

// Configuración de credenciales según el modo
let credentials;
if (config.securityMode === 'ssl') {
  const rootCert = fs.readFileSync(config.sslRootCertPath);
  credentials = grpc.ServerCredentials.createSsl(rootCert, []);
} else {
  credentials = grpc.ServerCredentials.createInsecure();
}

const server = new GrpcServerWrapper({
  host: config.host,
  port: config.port,
  credentials,
  shutdownTimeoutMs: config.shutdownTimeoutMs
});

server.use(loggingMiddleware);

server.addService(proto.Greeter.service, {
  SayHello: sayHello
});

server.start();
