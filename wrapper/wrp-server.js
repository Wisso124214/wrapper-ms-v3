const grpc = require('@grpc/grpc-js');
const fs = require('fs');

class GrpcServerWrapper {
  constructor(config = {}) {
    this.server = new grpc.Server();
    this.middlewares = [];
    this.methods = {};
    this.config = {
      host: '0.0.0.0',
      port: 50051,
      shutdownTimeoutMs: 60000,
      ...config,
    };
  }

  use(middleware) {
    this.middlewares.push(middleware);
  }

  addMethod(methodName, handler) {
    const wrappedHandler = this.applyMiddlewares(handler);
    this.methods[methodName] = wrappedHandler;
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

  addService(service, implementation) {
    const wrappedImpl = {};
    for (const method in implementation) {
      wrappedImpl[method] = this.applyMiddlewares(implementation[method]);
    }
    this.server.addService(service, wrappedImpl);
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