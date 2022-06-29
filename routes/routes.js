import { historyRoutes } from "./history.js";
import { locationRoutes } from "./location.js";

export const appRouter = (app, fs) => {
  app.get("/", (req, res) => {
    res.send("welcome to the development api-server");
  });

  historyRoutes(app, fs);
  locationRoutes(app, fs);
};
