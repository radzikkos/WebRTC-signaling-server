const http = require("http");
const websocket = require("ws");
require("dotenv").config();

const server = http.createServer((req, res) => {
  res.end("I am connected");
});
const wss = new websocket.Server({ server });

wss.on("connection", (ws, req) => {
  console.log("Peer connected");
  //receive the message from client on Event: 'message'
  ws.on("message", (msg) => {
    // console.log("sending message");
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === websocket.OPEN) {
        try {
          const object = JSON.parse(msg);
          // console.log(object.peerType);
          if (msg && object.type === "offer") {
            console.log("Sending offer");
            client.send(JSON.stringify(object));
          } else if (msg && object.type === "answer") {
            console.log("Sending answer");
            client.send(JSON.stringify(object));
          } else if (msg && object.type === "new-ice-candidate") {
            console.log("Sending sending new candidate from ", object.peerType);
            client.send(JSON.stringify(object));
          } else if (msg && object.type === "initiating") {
            console.log("Initiate message");
            client.send(JSON.stringify(object));
          }
        } catch (err) {
          console.log(err);
        }
      }
    });
  });
});

const port = process.env.PORT || 8000;
server.listen(port);
console.log(`Listening on port ${port}`);
