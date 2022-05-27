const express = require("express");
const cors = require("cors");

const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  ObjectID,
} = require("mongodb");
require("dotenv").config();

const stripe = require("stripe")(
  "sk_test_51L3coEHN4mnREwvODJJUw5elLui8uCH1gcPEgeoGloaCe6wyGcfAVb8bUSfj64BKSiFSiYvM038inaK4QMKs92zR00go8ebqL7"
);

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6v2jucb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("manufacturer").collection("products");
    const orderCollection = client.db("manufacturer").collection("orders");

    //get all user with jwt token
    app.get("/products", async (req, res) => {
      const products = await productsCollection.find().toArray();
      res.send(products);
    });

    //get product details by id
    app.get("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });

    //insert order
    app.post("/order", async (req, res) => {
      const order = req.body;
      console.log(order);
      const result = await orderCollection.insertOne(order);
      console.log(result);
      res.send(result);
    });

    //get order
    app.get("/orders", async (req, res) => {
      const clientEmail = req.query.clientEmail;
      // const authorization = req.headers.authorization;
      // const decodedEmail = req.decoded.email;

      const query = { clientEmail: clientEmail };
      const orders = await orderCollection.find(query).toArray();
      return res.send(orders);
      // if (patientEmail === decodedEmail) {
      //   const query = { patientEmail: patientEmail };
      //   const bookings = await bookingCollection.find(query).toArray();
      //   return res.send(bookings);
      // } else {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
    });

    // delete order
    app.delete("/order/:orderId", async (req, res) => {
      const orderId = req.params.orderId;
      console.log(orderId);
      const filter = { _id: ObjectID(orderId) };
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    });

    //get all user with jwt token
    app.get("/", async (req, res) => {
      const products = await productsCollection.find().toArray();
      res.send(products);
    });

    //get product from orders for payment
    app.get("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await orderCollection.findOne(query);
      res.send(product);
    });
    //payment

    app.post("/create-payment-intent", async (req, res) => {
      const { totalAmount } = req.body;

      const amount = totalAmount * 100;

      console.log(totalAmount, amount);
      //Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: calculateOrderAmount(amount),
        currency: "usd",
        peyment_method_type: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
  } finally {
  }
}

run().catch(console.dir);

//root api
app.get("/", (req, res) => {
  res.send(" Manufacturer-website-assignment    ");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
