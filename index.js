const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());
app.use(cors());

//root api
app.get("/", (req, res) => {
  res.send(" Manufacturer-website-assignment    ");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
