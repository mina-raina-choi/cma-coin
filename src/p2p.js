const WebSockets = require("ws");

const sockets = [];

const getSockets = () => sockets;

const startP2PServer = server => {
  const wsServer = new WebSockets.Server({ server });
  wsServer.on("connection", ws => {
    //   ws는 내 서버에 접속된 웹소켓을 의미함
    console.log(`Hello ${"Socket"}`);
    initSocketConnection(ws);
  });
  console.log(`cma-coin P2P Server running!!`);
};

const initSocketConnection = socket => {
  sockets.push(socket);
  socket.on("message", data => {
    console.log(data);
  });
  setTimeout(() => {
    socket.send("welcome");
  }, 5000);
};
// newPeer is URL that websocket is running on
const connectToPeers = newPeer => {
  const ws = new WebSockets(newPeer);
  ws.on("open", () => {
    console.log(`open Socket`);
    initSocketConnection(ws);
  });
};

module.exports = {
  startP2PServer,
  connectToPeers
};
