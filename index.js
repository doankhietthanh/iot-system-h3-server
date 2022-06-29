import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import fs from "fs";
import request from "request";
import { database, onValue, ref } from "./routes/firebase.js";
import { appRouter } from "./routes/routes.js";

const app = express();
import http from "http";
const server = http.createServer(app);
import { Server } from "socket.io";
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.set("socketio", io);
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const routes = appRouter(app, fs);

àas;

const convertDateToTimestamp = (date, time) => {
  const time1 = date.split(",")[1].split("/");
  const dateStr =
    time1[1] + "/" + time1[0] + "/" + "20" + time1[2] + " " + time;
  const [dateRelated, timeRelated] = dateStr.split(" ");
  const [month, day, year] = dateRelated.split("/");
  const [hours, minutes, seconds] = timeRelated.split(":");

  const date2 = new Date(+year, month - 1, +day, +hours, +minutes, +seconds);

  return date2.getTime();
};

let docsHistory = {};
let docsLocation = {};

// let nameLocationList = [];
// let nodeList = [];
onValue(ref(database, "location"), (snapshot) => {
  const data = snapshot.val();
  console.log(data);
  const nameLocationList = Object.keys(data);
  const nodeList = Object.values(data);

  setTimeout(() => {
    nameLocationList.forEach((nameLocation, index) => {
      const nodeName = Object.keys(nodeList[index]);
      let docsNewNode = {};
      nodeName.forEach((node) => {
        let docsNewTime = {};
        onValue(
          ref(database, "location/" + nameLocation + "/" + node),
          (snapshot) => {
            const data = snapshot.val();
            const timestamp = convertDateToTimestamp(data.time);

            docsHistory[timestamp] = {
              [nameLocation]: {
                [node]: data.sensors,
              },
            };

            docsNewTime[timestamp] = data.sensors;
            docsNewNode[node] = { ...docsNewTime };
            docsLocation[nameLocation] = { ...docsNewNode };
          }
        );
      });
    });
  }, 2000);

  request.post({
    headers: { "content-type": "application/json" },
    url: "http://localhost:8080/history",
    body: JSON.stringify({ ...docsHistory }),
  });

  io.emit("history", { ...docsHistory });

  request.post({
    headers: { "content-type": "application/json" },
    url: `http://localhost:8080/location`,
    body: JSON.stringify({ ...docsLocation }),
  });

  io.emit("location", { ...docsLocation });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, console.log(`Server Run With Port ${PORT}`));
