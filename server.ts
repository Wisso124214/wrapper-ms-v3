import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as fs from 'fs';
import { GrpcServerWrapper } from './wrapper/wrp-server';

const config = JSON.parse(fs.readFileSync('./server-config.json', 'utf8'));
const PROTO_PATH = __dirname + '/proto/greeter.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const proto: any = grpc.loadPackageDefinition(packageDefinition).greeter;

function sayHello(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
  callback(null, { message: `Hola, ${call.request.name}!` });
}

// Middleware de ejemplo
function loggingMiddleware(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>, next: Function) {
  console.log('Petición recibida:', call.request);
  next();
}

// Configuración de credenciales según el modo
let credentials: grpc.ServerCredentials;
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
