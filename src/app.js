import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from "morgan"

import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/user.routes.js"

const app = express();


app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"))

app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)


app.get('/', (req,res)=>{
    res.send("Backend Running....")
})

export default app;