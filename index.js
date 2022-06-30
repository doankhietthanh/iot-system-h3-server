import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import nodemailer from "nodemailer";
import fs from "fs";
import request from "request";
import {
  database,
  onValue,
  ref,
  set,
  update,
  get,
  child,
} from "./controller/firebase.js";
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
// let nameLocationList = [];
// let nodeList = [];
let docsValueSensorsThreshold = {};
let docsNameSensor = [];
let docsHistoryCurrent = {};

fs.readFile(dataHistory, (err, data) => {
  docsHistory = JSON.parse(data);
});

fs.readFile(dataLocation, (err, data) => {
  docsLocation = JSON.parse(data);
});

function sleep(ms) {
  var d = new Date();
  var d2 = null;
  do {
    d2 = new Date();
  } while (d2 - d < ms);
}
onValue(ref(database, "settings/sensor"), (snapshot) => {
  docsValueSensorsThreshold = snapshot.val();
  docsNameSensor = Object.keys(docsValueSensorsThreshold);
});

onValue(ref(database, "location"), (snapshot) => {
  const data = snapshot.val();
  const nameLocationList = Object.keys(data);
  const nodeList = Object.values(data);

  request.post({
    headers: { "content-type": "application/json" },
    url: "http://localhost:8080/current",
    body: JSON.stringify(data),
  });

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

setInterval(() => {
  request("http://localhost:8080/current", function (error, response, body) {
    const data = JSON.parse(body);
    const nameLocationList = Object.keys(data);
    const nodeList = Object.values(data);
    nameLocationList.forEach((nameLocation, index) => {
      const nameNodeList = Object.keys(nodeList[index]);
      const valueNodeList = Object.values(nodeList[index]);
      nameNodeList.forEach((nameNode, i) => {
        const valueNode = valueNodeList[i];
        const nameSensorList = Object.keys(valueNode.sensors);
        const valueSensorList = Object.values(valueNode.sensors);
        let nameSensorThresholdList = [];
        let valueSensorThresholdList = [];
        if (valueSensorList.every((value) => value == -1)) {
          sendEmail(
            nameLocation,
            nameNode,
            nameSensorThresholdList,
            valueSensorThresholdList,
            "offline"
          );
        } else {
          nameSensorList.forEach((nameSensor, j) => {
            if (
              parseInt(valueSensorList[j]) <
              docsValueSensorsThreshold[nameSensor].minT
            ) {
              nameSensorThresholdList.push(nameSensor);
              valueSensorThresholdList.push(valueSensorList[j]);
            }
          });

          sendEmail(
            nameLocation,
            nameNode,
            nameSensorThresholdList,
            valueSensorThresholdList,
            "threshold"
          );
        }
      });
    });
  });
}, 5 * 60000);

const sendEmail = (
  nameLocation,
  nameNode,
  nameSensorList,
  valueSensorList,
  action
) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "19119220@student.hcmute.edu.vn", // generated ethereal user
      pass: "Thanh2001@", // generated ethereal password
    },
  });
  let email;
  if (action == "threshold") {
    let tableHtml = "";
    nameSensorList.forEach((nameSensor, index) => {
      tableHtml += `
      <tr>
        <td style="text-transform: uppercase;" >${nameSensor}</td>
        <td>${valueSensorList[index]}</td>
      </tr>
      `;
    });
    email = {
      from: "19119220@student.hcmute.edu.vn",
      to: "19119088@student.hcmute.edu.vn",
      subject: "OVERLOAD THRESHOLD WARNING ⚠️⚠️⚠️",
      html: `
      <h4>OVERLOAD THRESHOLD WARNING ⚠️⚠️⚠️</h4>
      <h3 style="text-transform: uppercase;">${nameLocation} - ${nameNode}</h3>
      </table>
        <thead>
          <tr>
            <th>Sensor</th>
            <th>Value</th>
          </tr>
        </thead>

        <tbody>
          ${tableHtml}
        </tbody>

      </table>`,
    };
  } else if (action == "offline") {
    email = {
      from: "19119220@student.hcmute.edu.vn",
      to: "19119088@student.hcmute.edu.vn",
      subject: "DISCONNECTED NODE ❌❌❌",
      html: `
      <h4>DISCONNECTED NODE ❌❌❌</h4>
      <h3 style="text-transform: uppercase;">${nameLocation} - ${nameNode} <span> is disconnected ❎</span></h3>
      `,
    };
  }

  transporter.sendMail(email, (err, data) => {
    if (err) {
      console.log("Send Error");
    } else {
      console.log("Send Success");
    }
  });
};

const PORT = process.env.PORT || 8080;
server.listen(PORT, console.log(`Server Run With Port ${PORT}`));
