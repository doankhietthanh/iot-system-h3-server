export const locationRoutes = (app, fs) => {
  const dataPath = "./data/location.json";

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
  app.get("/location", (req, res) => {
    readFile((data) => {
      res.send(data);
    }, true);
  });

  // SEARCH by location
  app.get("/location/:name", (req, res) => {
    readFile((data) => {
      const name = req.params.name;
      res.send(data[name]);
    }, true);
  });

  // // SEARCH by node
  app.get("/location/:name/:node", (req, res) => {
    readFile((data) => {
      const name = req.params.name;
      const node = req.params.node;

      res.send(data[name][node]);
    }, true);
  });

  // CREATE
  app.post("/location", (req, res) => {
    readFile((data) => {
      data = req.body;

      // console.log(data);

      writeFile(JSON.stringify(data, null, 2), () => {
        res.status(200).send("new location added");
      });
    }, true);
  });

  app.post("/location/:name/:node", (req, res) => {
    readFile((data) => {
      const name = req.params.name;
      const node = req.params.node;

      data[name] = {
        [node]: req.body,
      };

      console.log(data);

      console.log({ [name]: { [node]: req.body } });

      writeFile(JSON.stringify(data, null, 2), () => {
        res.status(200).send("new location added");
      });
    }, true);
  });
};
