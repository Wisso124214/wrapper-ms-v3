import * as grpc from '@grpc/grpc-js';
import * as fs from 'fs';

type Middleware = (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>, next: Function) => void;

interface GrpcServerConfig {
  host?: string;
  port?: number;
  credentials?: grpc.ServerCredentials;
  sslRootCertPath?: string;
  googleAuth?: boolean;
  customHeaderToken?: string;
  shutdownTimeoutMs?: number;
}

export class GrpcServerWrapper {
  private server: grpc.Server;
  private middlewares: Middleware[] = [];
  private methods: { [key: string]: grpc.UntypedHandleCall } = {};
  private config: GrpcServerConfig;

  constructor(config: GrpcServerConfig = {}) {
    this.server = new grpc.Server();
    this.config = {
      host: '0.0.0.0',
      port: 50051,
      shutdownTimeoutMs: 60000,
      ...config,
    };
  }

  use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }

  addMethod(methodName: string, handler: grpc.UntypedHandleCall) {
    // Wrap handler with middlewares
    const wrappedHandler = this.applyMiddlewares(handler);
    this.methods[methodName] = wrappedHandler;
  }

  private applyMiddlewares(handler: grpc.UntypedHandleCall): grpc.UntypedHandleCall {
    return (call: any, callback: any) => {
      let idx = 0;
      const next = (err?: any) => {
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

  private handleError(err: any, call: any, callback: any) {
    console.error('gRPC Error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: err.message || 'Internal server error',
    });
  }

  addService(service: grpc.ServiceDefinition<any>, implementation: any) {
    // Wrap all handlers with middlewares
    const wrappedImpl: any = {};
    for (const method in implementation) {
      wrappedImpl[method] = this.applyMiddlewares(implementation[method]);
    }
    this.server.addService(service, wrappedImpl);
  }

  private getServerCredentials(): grpc.ServerCredentials {
    if (this.config.credentials) return this.config.credentials;
    if (this.config.sslRootCertPath) {
      const rootCert = fs.readFileSync(this.config.sslRootCertPath);
      return grpc.ServerCredentials.createSsl(rootCert, []);
    }
    // Default: insecure
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

  private setupShutdown() {
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