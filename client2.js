'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, 'proto', 'greeter.proto'); // Ajusta el nombre del proto si es necesario

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoService = grpc.loadPackageDefinition(packageDefinition).greeter; // Ajusta el nombre del paquete si es necesario

const client = new protoService.Greeter('localhost:50051', grpc.credentials.createInsecure()); // Ajusta el nombre del servicio si es necesario
const request = { name: 'Luis' };

client.sayHello(request, (err, response) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Respuesta:', response);
});
