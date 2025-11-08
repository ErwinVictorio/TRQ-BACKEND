import express from "express";
import cors from "cors";

import { itemsRoutes } from "./Routes/ItemRoutes.js"; // adjust path

const app = express();
app.use(express.json());

//  Configure CORS properly
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend origin
    credentials: true, // allow cookies
  })
);

// your routes
app.use("/api", itemsRoutes);

app.listen(3000, () => console.log("Server running on port 3000"));
