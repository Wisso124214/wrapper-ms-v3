const clientConfig = {
  "address": "localhost:50051",
  "securityMode": "insecure",
  "sslRootCertPath": "./certs/localhost.cert.pem",
  "customHeaderToken": "my-secret-token",
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

module.exports = { clientConfig };