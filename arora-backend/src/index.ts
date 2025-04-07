import express from "express";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8000;

app.get("/check", (_, res) => {
  res.json("im working fine")
})

app.post

app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`)
})
