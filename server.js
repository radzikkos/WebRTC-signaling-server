const http = require("http");
const websocket = require("ws");
require("dotenv").config();
const axios = require("axios");
// console.log(process.env.NODE_ENV == "development");
let authServer = null;
if (process.env.NODE_ENV == "development") {
  authServer = "http://localhost:3001";
  // authServer = "https://glacial-savannah-72812.herokuapp.com";
} else {
  authServer = "https://glacial-savannah-72812.herokuapp.com";
}
const server = http.createServer((req, res) => {
  res.end("I am connected");
});
server.on("upgrade", async function upgrade(req, socket, head) {
  const token = req.url;
  // console.log(token);
  try {
    wss.handleUpgrade(req, socket, head, async function (ws) {
      const result = await axios.get(authServer + `/user${token}`);
      console.log(result.data);
      // console.log(result.data);
      if (!result.data.authenticated) {
        socket.destroy();
        console.log("Not authenticated");
      } else {
        ws.id = result.data.user.id;
        ws.user = result.data.user;
        addToConnectedPeers(ws);
        broadcastConnectedPeers(wss);
        // console.log("Authenticated");
        wss.emit("connection", ws);
      }
    });
  } catch (err) {
    console.log(err);
    socket.destroy();
  }
});
const wss = new websocket.Server({ noServer: true });

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
      return {
        id: peer.id,
        firstname: peer.client.user.firstname,
        lastname: peer.client.user.lastname,
        email: peer.client.user.email,
      };
    }),
    type: "peers",
  };
  console.log(object);
  wss.clients.forEach((client) => {
    if (client.readyState === websocket.OPEN) {
      client.send(JSON.stringify(object));
    }
  });
}
let peersNo = 0;
let connectedPeers = [];
wss.on("connection", (ws, req) => {
  console.log("Peer connected");
  // peersNo++;
  // ws.id = peersNo;
  // addToConnectedPeers(ws);
  // ws.send(JSON.stringify({ type: "myId", id: ws.id }));
  // broadcastConnectedPeers(wss);
  //receive the message from client on Event: 'message'
  ws.send(JSON.stringify({ type: "myId", id: ws.id }));
  ws.on("message", (msg) => {
    // console.log("sending message");
    // const parsedMsg = JSON.parse(msg);
    // if (parsedMsg.type === "identify-user") {
    //   console.log("Identify user");
    //   // ws.id = parsedMsg.user.id;
    //   // ws.user = parsedMsg.user;
    //   // addToConnectedPeers(ws);
    //   // broadcastConnectedPeers(wss);
    //   ws.send(JSON.stringify({ type: "myId", id: parsedMsg.user.id }));
    // }

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
