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
let docsHistoryCurrent = {};

fs.readFile(dataHistory, (err, data) => {
  docsHistory = JSON.parse(data);
});

fs.readFile(dataLocation, (err, data) => {
  docsLocation = JSON.parse(data);
});

onValue(ref(database, "settings/sensor"), (snapshot) => {
  docsValueSensorsThreshold = snapshot.val();
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

  nameLocationList.forEach((nameLocation, index) => {
    const nodeName = Object.keys(nodeList[index]);
    nodeName.forEach((node) => {
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

          if (docsLocation[nameLocation] != undefined) {
            if (docsLocation[nameLocation][node] != undefined) {
              docsHistoryCurrent = docsLocation[nameLocation][node];
              docsHistoryCurrent[timestamp] = data.sensors;
              docsLocation[nameLocation][node] = docsHistoryCurrent;
            } else {
              docsLocation[nameLocation][node] = {
                [timestamp]: data.sensors,
              };
            }
          } else {
            docsLocation[nameLocation] = {
              [node]: {
                [timestamp]: data.sensors,
              },
            };
          }
        }
      );
    });
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, console.log(`Server Run With Port ${PORT}`));
