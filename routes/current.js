export const currentRoutes = (app, fs) => {
  const dataPath = "./data/current.json";

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
  app.get("/current", (req, res) => {
    readFile((data) => {
      res.send(data);
    }, true);
  });

  // CREATE
  app.post("/current", (req, res) => {
    readFile((data) => {
      data = req.body;

      // console.log(data);

      writeFile(JSON.stringify(data, null, 2), () => {
        res.status(200).send("new history added");
      });
    }, true);
  });
};
