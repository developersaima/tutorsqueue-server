import dotenv from "dotenv";
dotenv.config();
import express from "express";
const app = express();

let port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log("Server is running on " + port);
});
