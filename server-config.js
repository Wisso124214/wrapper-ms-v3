const serverConfig = {
  "host": "0.0.0.0",
  "port": 50051,
  "securityMode": "insecure",
  "sslRootCertPath": "./certs/localhost.crt",
  "customHeaderToken": "my-secret-token",
  "shutdownTimeoutMs": 600000,
  "protoPath": "./proto/greeter.proto",
  "optionsProto": {
    "keepCase": true,
    "longs": String,
    "enums": String,
    "defaults": true,
    "oneofs": true
  },
  "packageName": "greeter",
  "serviceName": "Greeter",
}

module.exports = { serverConfig };