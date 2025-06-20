const grpc = require('@grpc/grpc-js');
const fs = require('fs');
const protoLoader = require('@grpc/proto-loader');
const { serverConfig } = require('../server-config.js');

class GrpcServerWrapper {
  constructor() {
    this.config = { ...serverConfig };

    this.server = new grpc.Server();
    this.middlewares = [];
    this.methods = {};

    this.packageDefinition = protoLoader.loadSync(this.config.protoPath, this.config.optionsProto);
    this.loadedPackage = grpc.loadPackageDefinition(this.packageDefinition)[this.config.packageName];
  }

  use(middleware) {
    this.middlewares.push(middleware);
  }

  addMethods(methodObj) {
    for (const [methodName, handler] of Object.entries(methodObj)) {
      const wrappedHandler = this.applyMiddlewares(handler);
      this.methods[methodName] = wrappedHandler;
    }
  }

  applyMiddlewares(handler) {
    return (call, callback) => {
      let idx = 0;
      const next = (err) => {
        if (err) return this.handleError(err, call, callback);
        if (idx < this.middlewares.length) {
          const mw = this.middlewares[idx++];
          mw(call, callback, next);
        } else {
          handler(call, callback);
        }
      };
      next();
    };
  }

  handleError(err, call, callback) {
    console.error('gRPC Error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message || 'Internal server error',
    });
  }

  getServerCredentials() {
    if (this.config.credentials) return this.config.credentials;
    if (this.config.sslRootCertPath) {
      const rootCert = fs.readFileSync(this.config.sslRootCertPath);
      return grpc.ServerCredentials.createSsl(rootCert, []);
    }
    return grpc.ServerCredentials.createInsecure();
  }

  start() {
    console.log('Iniciando el servidor gRPC...');

    if (!this.loadedPackage[this.config.serviceName]) {
      console.error(`El servicio ${this.config.serviceName} no está definido en el paquete ${this.config.packageName}.`);
      return;
    }

    console.log('methods', this.methods);
    this.server.addService(this.loadedPackage[this.config.serviceName].service, this.methods);
    const address = `${this.config.host}:${this.config.port}`;
    const creds = this.getServerCredentials();
    this.server.bindAsync(address, creds, (err, port) => {
      if (err) {
        console.error('Failed to bind server:', err);
        return;
      }
      console.log(`gRPC server started on ${address}`);
      this.setupShutdown();
    });
  }

  setupShutdown() {
    setTimeout(() => {
      console.log('Apagando el servidor gRPC por timeout...');
      this.server.tryShutdown((err) => {
        if (err) {
          console.error('Error al apagar el servidor:', err);
        } else {
          console.log('Servidor gRPC apagado correctamente.');
        }
      });
    }, this.config.shutdownTimeoutMs);
  }
}

module.exports = { GrpcServerWrapper };