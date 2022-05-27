const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

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

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    w;
    return res.status(401).send({ message: "unauthorize" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next(); // for got
  });
};

async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("manufacturer").collection("products");
    const orderCollection = client.db("manufacturer").collection("orders");
    const usersCollection = client.db("manufacturer").collection("users");
    const reviewsCollection = client.db("manufacturer").collection("reviews");

    //make a user role  and give access token for login and other auth
    app.put("/user/:email", async (req, res) => {
      const user = req.body;
      console.log(user);
      const email = req.params.email;
      console.log(email);
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ result, accessToken: token });
    });

    //get all user with jwt token
    app.get("/products", async (req, res) => {
      const products = await productsCollection.find().toArray();
      res.send(products);
    });

    //get product details by id
    app.get("/purchase/:id", verifyJWT, async (req, res) => {
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
    app.get("/orders", verifyJWT, async (req, res) => {
      const clientEmail = req.query.clientEmail;
      const authorization = req.headers.authorization;
      const decodedEmail = req.decoded.email;

      if (clientEmail === decodedEmail) {
        const query = { clientEmail: clientEmail };
        const orders = await orderCollection.find(query).toArray();
        return res.send(orders);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    // delete order
    app.delete("/order/:orderId", verifyJWT, async (req, res) => {
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

    //insert reviews
    app.post("/review", verifyJWT, async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    // get all reviews
    app.get("/reviews", async (req, res) => {
      const reviews = await reviewsCollection.find().toArray();
      res.send(reviews);
    });

    // update user or admin info
    app.put("/myprofile/:email", async (req, res) => {
      const user = req.body;
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };

      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result)
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
