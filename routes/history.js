export const historyRoutes = (app, fs) => {
  const dataPath = "./data/history.json";

  const readFile = (
    callback,
    returnJson = false,
    filePath = dataPath,
    encoding = "utf8"
  ) => {
    fs.readFile(filePath, encoding, (err, data) => {
      if (err) {
        throw err;
      }
      try {
        callback(returnJson ? JSON.parse(data) : data);
        // callback(JSON.parse(data));
      } catch (err) {
        console.log(err);
      }
    });
  };

  const writeFile = (
    fileData,
    callback,
    filePath = dataPath,
    encoding = "utf8"
  ) => {
    fs.writeFile(filePath, fileData, encoding, (err) => {
      if (err) {
        throw err;
      }

      callback();
    });
  };

  // READ
  app.get("/history", (req, res) => {
    readFile((data) => {
      res.send(data);
    }, true);
  });

  // SEARCH by time
  app.get("/history/:time", (req, res) => {
    readFile((data) => {
      const time = req.params.time;
      res.send(data[time]);
    }, true);
  });

  // SEARCH by location
  app.get("/history/:time/:location", (req, res) => {
    readFile((data) => {
      const time = req.params.time;
      const location = req.params.location;
      res.send({ [time]: data[time][location] });
    }, true);
  });

  // SEARCH by node
  app.get("/history/:time/:location/:node", (req, res) => {
    readFile((data) => {
      const time = req.params.time;
      const location = req.params.location;
      const node = req.params.node;
      res.send({ [time]: data[time][location][node] });
    }, true);
  });

  // CREATE
  app.post("/history", (req, res) => {
    writeFile(JSON.stringify(req.body, null, 2), () => {
      res.status(200).send("new history added");
    });
  });

  // UPDATE
  app.put("/history/:id", (req, res) => {
    readFile((data) => {
      const userId = req.params["id"];
      data[userId] = req.body;

      writeFile(JSON.stringify(data, null, 2), () => {
        res.status(200).send(`history id:${userId} updated`);
      });
    }, true);
  });

  // DELETE
  app.delete("/history/:id", (req, res) => {
    readFile((data) => {
      const userId = req.params["id"];
      console.log(userId);
      delete data[userId];

      writeFile(JSON.stringify(data, null, 2), () => {
        res.status(200).send(`history id:${userId} removed`);
      });
    }, true);
  });
};
