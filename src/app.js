import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import apiFetch from "./route/apiFetch.js"
const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}))

app.use(express.json({limit: "128kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(cookieParser())

// Simple route handlers
app.use("/api/healthcheck",apiFetch)

// Server listening
const PORT = /*process.env.PORT*/ 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

export { app }
