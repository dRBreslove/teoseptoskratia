import http from 'http';
import { Server, Client } from './socket.io-cb.js';

const httpServer = http.createServer();
httpServer.listen(3000);

const server = new Server(httpServer, (socket) => {
  socket.on('func', (data, cb) => {
    console.log(data); // 123
    cb('XYZ');
  });
});

const client = new Client('http://localhost:3000');
client.emit('func', '123', (data) => {
  console.log(data); // XYZ
  client.disconnect();
  server.close();
});
