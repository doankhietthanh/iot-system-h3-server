import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import nodemailer from "nodemailer";
import fs from "fs";
import request from "request";
import { database, onValue, ref } from "./controller/firebase.js";
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
const dataLocation = "./data/location.json";
const dataHistory = "./data/history.json";

let docsHistory = {};
let docsLocation = {};
let nameLocationList = [];
let nodeList = [];
let docsValueSensorsThreshold = {};
let docsNameSensor = [];
let docs1 = {};

fs.readFile(dataHistory, (err, data) => {
  docsHistory = JSON.parse(data);
});

fs.readFile(dataLocation, (err, data) => {
  docsLocation = JSON.parse(data);
});

onValue(ref(database, "settings/sensor"), (snapshot) => {
  docsValueSensorsThreshold = snapshot.val();
  docsNameSensor = Object.keys(docsValueSensorsThreshold);
});

onValue(ref(database, "location"), (snapshot) => {
  const data = snapshot.val();
  nameLocationList = Object.keys(data);
  nodeList = Object.values(data);

  request.post({
    headers: { "content-type": "application/json" },
    url: "http://localhost:8080/history",
    body: JSON.stringify({ ...docsHistory }),
  });

  request.post({
    headers: { "content-type": "application/json" },
    url: "http://localhost:8080/location",
    body: JSON.stringify({ ...docsLocation }),
  });

  io.emit("history", { ...docsHistory });
});

setTimeout(() => {
  nameLocationList.forEach((nameLocation, index) => {
    let docsNewNode = {};
    const nodeName = Object.keys(nodeList[index]);
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

          docsNewTime[data.time] = { ...data.sensors };
          docsNewNode[node] = { ...docsNewTime };
          // docsLocation[nameLocation] = { ...docsNewNode };

          console.log("-------------");
          docs1 = docsLocation[nameLocation][node];
          docs1[data.time] = data.sensors;
          docsLocation[nameLocation][node] = { ...docs1 };
          console.log(docsLocation);
          console.log("-------------");
        }
      );
    });
  });
}, 5000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, console.log(`Server Run With Port ${PORT}`));
