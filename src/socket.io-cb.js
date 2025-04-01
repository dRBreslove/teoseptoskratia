import { Server as SocketIOServer } from 'socket.io';
import SocketIOClient from 'socket.io-client';
import { randomUUID } from 'crypto';

class Socket {
  constructor(p) {
    this.callbacks = {};
    this.listeners = {};
    this.socket = typeof p === 'string' ? SocketIOClient.connect(p) : p;

    this.socket.on('msg', (data) => {
      for (const key in this.listeners) {
        if (key === data.func) {
          this.listeners[key].forEach((cb) => {
            cb(data.data, (d) => {
              this.socket.emit('gsm', {
                uuid: data.uuid,
                data: d,
              });
            });
          });
        }
      }
    });
    
    this.socket.on('gsm', (data) => {
      this.callbacks[data.uuid](data.data);
      delete this.callbacks[data.data];
    });
  }

  emit(func, data, cb) {
    const uuid = randomUUID();
    this.callbacks[uuid] = cb;
    this.socket.emit('msg', {
      func,
      data,
      uuid,
    });
  }

  on(func, cb) {
    if (!this.listeners[func]) this.listeners[func] = [];
    this.listeners[func].push(cb);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

class Server {
  constructor(server, onConnection) {
    this.io = new SocketIOServer(server);
    this.io.on('connection', (socket) => {
      onConnection(new Socket(socket));
    });
  }

  close() {
    this.io.close();
  }
}

class Client {
  constructor(url) {
    this.socket = new Socket(url);
  }

  emit(func, data, cb) {
    this.socket.emit(func, data, cb);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

export { Server, Client, Socket };
