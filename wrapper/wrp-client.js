const grpc = require('@grpc/grpc-js');
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');

class GrpcClientWrapper {
  constructor(Client, address, credentials, options = {
    'grpc.max_receive_message_length': -1,
    'grpc.max_send_message_length': -1
  }) {
    this.Client = Client;
    this.address = address;
    this.credentials = credentials;
    this.options = options;
    this.client = null;
  }

  static createInsecure(Client, address) {
    const creds = grpc.credentials.createInsecure();
    return new GrpcClientWrapper(Client, address, creds);
  }

  static createSsl(Client, address, rootCertPath) {
    const rootCert = fs.readFileSync(rootCertPath);
    const creds = grpc.credentials.createSsl(rootCert);
    return new GrpcClientWrapper(Client, address, creds);
  }

  static async createGoogleAuth(Client, address, rootCertPath) {
    const rootCert = fs.readFileSync(rootCertPath);
    const sslCreds = grpc.credentials.createSsl(rootCert);
    const auth = new GoogleAuth();
    const clientAuth = await auth.getClient();
    const callCreds = grpc.credentials.createFromGoogleCredential(clientAuth);
    const combinedCreds = grpc.credentials.combineChannelCredentials(sslCreds, callCreds);
    return new GrpcClientWrapper(Client, address, combinedCreds);
  }

  static async createGoogleAuthWithScope(Client, address, rootCertPath, scope) {
    const rootCert = fs.readFileSync(rootCertPath);
    const sslCreds = grpc.credentials.createSsl(rootCert);
    const auth = new GoogleAuth();
    let clientAuth = await auth.getClient();
    if (clientAuth.createScopeRequired && clientAuth.createScopeRequired()) {
      clientAuth = clientAuth.createScoped(scope);
    }
    const callCreds = grpc.credentials.createFromGoogleCredential(clientAuth);
    const combinedCreds = grpc.credentials.combineChannelCredentials(sslCreds, callCreds);
    return new GrpcClientWrapper(Client, address, combinedCreds);
  }

  static createWithCustomHeader(Client, address, rootCertPath, headerKey, token) {
    const rootCert = fs.readFileSync(rootCertPath);
    const channelCreds = grpc.credentials.createSsl(rootCert);
    const metaCallback = (_params, callback) => {
      const meta = new grpc.Metadata();
      meta.add(headerKey, token);
      callback(null, meta);
    };
    const callCreds = grpc.credentials.createFromMetadataGenerator(metaCallback);
    const combCreds = grpc.credentials.combineChannelCredentials(channelCreds, callCreds);
    return new GrpcClientWrapper(Client, address, combCreds);
  }

  getClient() {
    if (!this.client) {
      this.client = new this.Client(this.address, this.credentials, this.options);
    }
    return this.client;
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async callMethod(methodName, ...args) {
    const client = this.getClient();
    return new Promise((resolve, reject) => {
      client[methodName](...args, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }
}

module.exports = { GrpcClientWrapper };
