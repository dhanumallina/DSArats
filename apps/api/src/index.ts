import { createApp } from "./app";
import { config } from "./config";

const app = createApp();

app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`⚡ DSARats API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
});