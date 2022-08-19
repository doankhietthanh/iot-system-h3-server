import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import fs from "fs";
import http from "http";
import nodemailer from "nodemailer";
import request from "request";
import { Server } from "socket.io";
import { database, onValue, ref } from "./controller/firebase.js";
import { appRouter } from "./routes/routes.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true, //access-control-allow-credentials:true
  },
});

app.set("socketio", io);
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const TIME_SEND_MAIL = 3 * 60000;

const routes = appRouter(app, fs);

const convertDateToTimestamp = (date) => {
  if (!date) return;
  const dateStr = date.split(",")[1].split(" ")[0].split("/");
  const dateRelated = dateStr[1] + "/" + dateStr[0] + "/" + "20" + dateStr[2];
  const timeRelated = date.split(",")[1].split(" ")[1];
  const [month, day, year] = dateRelated.split("/");
  const [hours, minutes, seconds] = timeRelated.split(":");
  const date2 = new Date(+year, month - 1, +day, +hours, +minutes, +seconds);
  return date2.getTime();
};

const endPoint = "https://iot-system-h3-server.herokuapp.com/";
// const endPoint = "http://localhost:3000/";

const dataLocation = "./data/location.json";
const dataHistory = "./data/history.json";

let docsHistory = {};
let docsLocation = {};
let docsHistoryCurrent = {};
let docsValueSensorsThreshold = {};
// let nameLocationList = [];
// let nodeList = [];

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
  const nameLocationList = Object.keys(data);
  const nodeList = Object.values(data);

  request.post({
    headers: { "content-type": "application/json" },
    url: endPoint + "current",
    body: JSON.stringify(data),
  });

  nameLocationList.forEach((nameLocation, index) => {
    const nameNodeList = Object.keys(nodeList[index]);
    const valueNodeList = Object.values(nodeList[index]);
    nameNodeList.forEach((node, i) => {
      onValue(
        ref(database, "location/" + nameLocation + "/" + node),
        (snapshot) => {
          const data = snapshot.val();
          if (!data) return;

          io.emit("sensor", {
            location: nameLocation,
            node: node,
            sensors: data.sensors,
            timestamp: convertDateToTimestamp(data.time),
          });

          const timestamp = convertDateToTimestamp(data.time);

          docsHistory[timestamp] = {
            [nameLocation]: {
              [node]: data.sensors,
            },
          };

          request.post({
            headers: { "content-type": "application/json" },
            url: endPoint + "history",
            body: JSON.stringify(docsHistory),
          });

          io.emit("history", { ...docsHistory });

          if (docsLocation[nameLocation] != undefined) {
            if (docsLocation[nameLocation][node] != undefined) {
              docsLocation[nameLocation][node][timestamp] = data.sensors;
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

          request.post({
            headers: { "content-type": "application/json" },
            url: endPoint + "location",
            body: JSON.stringify(docsLocation),
          });
        }
      );
    });
  });
});

setTimeout(() => {}, 5000);

// setInterval(() => {
//   request(endPoint + "current", function (error, response, body) {
//     const data = JSON.parse(body);
//     const nameLocationList = Object.keys(data);
//     const nodeList = Object.values(data);

//     let docsNodeDisconnect = [];
//     let docsSensorsOverloadThreshold = [];

//     nameLocationList.forEach((nameLocation, index) => {
//       const nameNodeList = Object.keys(nodeList[index]);
//       const valueNodeList = Object.values(nodeList[index]);

//       nameNodeList.forEach((nameNode, i) => {
//         const valueNode = valueNodeList[i];
//         const nameSensorList = Object.keys(valueNode.sensors);
//         const valueSensorList = Object.values(valueNode.sensors);

//         if (valueSensorList.every((value) => value == -1)) {
//           docsNodeDisconnect.push([nameLocation, nameNode]);
//         }
//         nameSensorList.forEach((nameSensor, j) => {
//           if (valueSensorList[j] != -1) {
//             if (
//               parseInt(valueSensorList[j]) <
//                 docsValueSensorsThreshold[nameSensor].minT ||
//               parseInt(valueSensorList[j]) >
//                 docsValueSensorsThreshold[nameSensor].maxT
//             ) {
//               docsSensorsOverloadThreshold.push([
//                 nameLocation,
//                 nameNode,
//                 nameSensor,
//                 valueSensorList[j],
//               ]);
//             }
//           }
//         });
//       });
//     });
//     console.log(docsNodeDisconnect);

//     if (docsNodeDisconnect.length > 0) {
//       sendEmail(docsNodeDisconnect, "nodeDisconnect");
//     }

//     if (docsSensorsOverloadThreshold.length > 0) {
//       sendEmail(docsSensorsOverloadThreshold, "sensorOverloadThreshold");
//     }
//   });
// }, TIME_SEND_MAIL);

const sendEmail = (data, action) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "19119220@student.hcmute.edu.vn", // generated ethereal user
      pass: "Thanh2001@", // generated ethereal password
    },
  });

  let email;
  if (action == "sensorOverloadThreshold") {
    let htmls = "";
    data.forEach((dt, index) => {
      htmls += `
      <tr>
        <td style="padding: 16px; text-align:center">${dt[0]}</td>
        <td style="padding: 16px; text-align:center">${dt[1]}</td>
        <td style="padding: 16px; text-align:center">${dt[2]}</td>
        <td style="padding: 16px; text-align:center">${dt[3]}</td>
      </tr>
      `;
    });
    email = {
      from: "19119220@student.hcmute.edu.vn",
      to: "19119088@student.hcmute.edu.vn",
      subject: "[WARNING] OUT OF THRESHOLD ⚠️⚠️⚠️",
      html: `
      <h3>🔥[WARNING] OUT OF THRESHOLD ⚠️</h3>
      <table border="1" style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
        <tr>
          <th style="padding: 16px">Location</th>
          <th style="padding: 16px">Node</th>
          <th style="padding: 16px">Sensor</th>
          <th style="padding: 16px">Value</th>
        </tr>
        ${htmls}
      </table>
      `,
    };
  } else if (action == "nodeDisconnect") {
    let htmls = "";
    data.forEach((dt, index) => {
      htmls += `
      <tr>
        <td style="padding: 16px; text-align:center">${dt[0]}</td>
        <td style="padding: 16px; text-align:center">${dt[1]}</td>
      </tr>
      `;
    });
    email = {
      from: "19119220@student.hcmute.edu.vn",
      to: "19119088@student.hcmute.edu.vn",
      subject: "DISCONNECTED NODE ❌❌❌",
      html: `
      <h3>💢🚫 DISCONNECTED NODE 🚫💢</h3>
      <table border="1" style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
        <tr>
          <th style="padding: 16px">Location</th>
          <th style="padding: 16px">Node</th>
        </tr>
        ${htmls}
      </table>
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

io.on("connection", (socket) => {
  socket.on("remove-location", (data) => {
    const timestampListHistory = Object.keys(docsHistory);
    const dataListHistory = Object.values(docsHistory);

    timestampListHistory.forEach((timestamp, index) => {
      const nameLocationList = Object.keys(dataListHistory[index]);
      const nodeList = Object.values(dataListHistory[index]);

      nameLocationList.forEach((nameLocation, i) => {
        if (nameLocation === data) {
          delete docsHistory[timestamp];
        }
      });
    });

    request.post({
      headers: { "content-type": "application/json" },
      url: endPoint + "history",
      body: JSON.stringify(docsHistory),
    });

    const nameLocationListLocation = Object.keys(docsLocation);
    nameLocationListLocation.forEach((nameLocation, index) => {
      if (nameLocation === data) {
        delete docsLocation[nameLocation];
      }
    });

    request.post({
      headers: { "content-type": "application/json" },
      url: endPoint + "location",
      body: JSON.stringify(docsLocation),
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, console.log(`Server Run With Port ${PORT}`));
