import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { itemsRoutes } from "./Routes/ItemRoutes.js";

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api", itemsRoutes);

io.on("connection", (socket) => {
  console.log(" Connected:", socket.id);
  socket.on("disconnect", () => console.log(" Disconnected:", socket.id));
});

server.listen(3000, () => console.log("Server + WebSocket running on 3000"));
