import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import employeeRoute from "./routes/employee";

dotenv.config();

const app = express();
const PORT = 3000

const corsOptions = {
    origin: "*"
}

app.use(cors(corsOptions));
app.use(bodyParser.json());



app.use("/api/employee", employeeRoute)

app.listen(PORT, ()=>{
    console.log("Listening on port 3000");
})