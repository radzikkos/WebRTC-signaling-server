const http = require("http");
const websocket = require("ws");
require("dotenv").config();

const server = http.createServer((req, res) => {
  res.end("I am connected");
});
const wss = new websocket.Server({ server });

function deleteFromConnectedPeers(array, client) {
  const index = array.findIndex((el) => {
    return el.id == client.id;
  });
  if (index != -1) {
    array.splice(index, 1);
    return true;
  }
  return false;
}
function addToConnectedPeers(ws) {
  connectedPeers.push({ client: ws, id: ws.id });
}

function broadcastConnectedPeers(wss, ws) {
  const object = {
    peers: connectedPeers.map((peer) => {
      return { id: peer.id };
    }),
    type: "peers",
  };
  wss.clients.forEach((client) => {
    if (client.readyState === websocket.OPEN) {
      client.send(JSON.stringify(object));
    }
  });
}
let peersNo = 0;
const connectedPeers = [];
wss.on("connection", (ws, req) => {
  console.log("Peer connected");
  peersNo++;
  ws.id = peersNo;
  addToConnectedPeers(ws);
  ws.send(JSON.stringify({ type: "myId", id: ws.id }));
  broadcastConnectedPeers(wss);
  //receive the message from client on Event: 'message'
  ws.on("message", (msg) => {
    // console.log("sending message");
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === websocket.OPEN) {
        try {
          const object = JSON.parse(msg);
          // console.log(object.peerType);
          if (msg && object.type === "offer" && client.id == object.toId) {
            console.log("Sending offer");
            client.send(JSON.stringify(object));
          } else if (
            msg &&
            object.type === "answer" &&
            client.id == object.toId
          ) {
            console.log("Sending answer");
            client.send(JSON.stringify(object));
          } else if (msg && object.type === "new-ice-candidate") {
            console.log("Sending sending new candidate from ", object.peerType);
            client.send(JSON.stringify(object));
          } else if (msg && object.type === "initiating") {
            if (object.toId) {
              console.log("SEND TO ONE CLIENT");
              if (client.id == object.toId) client.send(JSON.stringify(object));
            } else {
              console.log("Initiate message");
              client.send(JSON.stringify(object));
            }
          }
        } catch (err) {
          console.log(err);
        }
      }
    });
  });
  ws.on("close", () => {
    deleteFromConnectedPeers(connectedPeers, ws);
    console.log(
      connectedPeers.map((el) => {
        return el.id;
      })
    );
    broadcastConnectedPeers(wss);
  });
});

const port = process.env.PORT || 8000;
server.listen(port);
console.log(`Listening on port ${port}`);
