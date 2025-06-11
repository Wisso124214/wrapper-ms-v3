import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as fs from 'fs';
import { GrpcClientWrapper } from './wrapper/wrp-client';

const config = JSON.parse(fs.readFileSync('./client-config.json', 'utf8'));
const PROTO_PATH = __dirname + '/proto/greeter.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const proto: any = grpc.loadPackageDefinition(packageDefinition).greeter;

async function main() {
  let clientWrapper: GrpcClientWrapper;

  if (config.securityMode === 'ssl') {
    clientWrapper = GrpcClientWrapper.createSsl(proto.Greeter, config.address, config.sslRootCertPath);
  } else if (config.securityMode === 'customHeader') {
    clientWrapper = GrpcClientWrapper.createWithCustomHeader(
      proto.Greeter,
      config.address,
      config.sslRootCertPath,
      'custom-auth-header',
      config.customHeaderToken
    );
  } else {
    clientWrapper = GrpcClientWrapper.createInsecure(proto.Greeter, config.address);
  }

  try {
    const response = await clientWrapper.callMethod('SayHello', { name: 'Luis' });
    console.log('Respuesta del servidor:', response);
  } catch (err) {
    console.error('Error llamando al método:', err);
  }
}

main();
