import * as grpc from '@grpc/grpc-js';
import * as fs from 'fs';
import { GoogleAuth } from 'google-auth-library';

type ClientConstructor = new (address: string, credentials: grpc.ChannelCredentials, options?: object) => any;

export class GrpcClientWrapper {
    private client: any;

    constructor(
        private Client: ClientConstructor,
        private address: string,
        private credentials: grpc.ChannelCredentials,
        private options: object = {
            'grpc.max_receive_message_length': -1,
            'grpc.max_send_message_length': -1
        }
    ) {}

    static createInsecure(Client: ClientConstructor, address: string) {
        const creds = grpc.credentials.createInsecure();
        return new GrpcClientWrapper(Client, address, creds);
    }

    static createSsl(Client: ClientConstructor, address: string, rootCertPath: string) {
        const rootCert = fs.readFileSync(rootCertPath);
        const creds = grpc.credentials.createSsl(rootCert);
        return new GrpcClientWrapper(Client, address, creds);
    }

    static async createGoogleAuth(Client: ClientConstructor, address: string, rootCertPath: string) {
        const rootCert = fs.readFileSync(rootCertPath);
        const sslCreds = grpc.credentials.createSsl(rootCert);
        const auth = new GoogleAuth();
        const clientAuth = await auth.getClient();
        const callCreds = grpc.credentials.createFromGoogleCredential(clientAuth as any);
        const combinedCreds = grpc.credentials.combineChannelCredentials(sslCreds, callCreds);
        return new GrpcClientWrapper(Client, address, combinedCreds);
    }

    static async createGoogleAuthWithScope(Client: ClientConstructor, address: string, rootCertPath: string, scope: string) {
        const rootCert = fs.readFileSync(rootCertPath);
        const sslCreds = grpc.credentials.createSsl(rootCert);
        const auth = new GoogleAuth();
        let clientAuth = await auth.getClient();
        if ((clientAuth as any).createScopeRequired && (clientAuth as any).createScopeRequired()) {
            clientAuth = (clientAuth as any).createScoped(scope);
        }
        const callCreds = grpc.credentials.createFromGoogleCredential(clientAuth as any);
        const combinedCreds = grpc.credentials.combineChannelCredentials(sslCreds, callCreds);
        return new GrpcClientWrapper(Client, address, combinedCreds);
    }

    static createWithCustomHeader(Client: ClientConstructor, address: string, rootCertPath: string, headerKey: string, token: string) {
        const rootCert = fs.readFileSync(rootCertPath);
        const channelCreds = grpc.credentials.createSsl(rootCert);
        const metaCallback = (_params: any, callback: any) => {
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

    static sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async callMethod(methodName: string, ...args: any[]): Promise<any> {
        const client = this.getClient();
        return new Promise((resolve, reject) => {
            client[methodName](...args, (err: any, response: any) => {
                if (err) reject(err);
                else resolve(response);
            });
        });
    }
}
