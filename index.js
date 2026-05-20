import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { connectDB } from "./db.js";
import cors from "cors"
const app = express();

app.use(cors())
app.use(express.json())


connectDB();


let port = process.env.PORT || 5000;



app.listen(port, () => {
  console.log("Server is running on " + port);
});
