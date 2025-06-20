const { GrpcClientWrapper } = require('./wrapper/wrp-client');

async function main() {
  const clientWrapper = new GrpcClientWrapper();

  try {
    const response = await clientWrapper.callMethod('sayHello', { name: 'Luis' });
    console.log('Respuesta del servidor:', response);
  } catch (err) {
    console.error('Error llamando al método:', err);
  }
}

main();
