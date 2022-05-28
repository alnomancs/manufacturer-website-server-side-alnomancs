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

const stripe = require("stripe")(process.env.STRIP_SECRET_KEY);

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

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requestAcc = await usersCollection.findOne({ email: requester });
      if (requestAcc.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    };

    //payment
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      const totalAmount = service.totalAmount;
      const amount = totalAmount * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    //make a user role  and give access token for login and other auth
    app.put("/user/:email", async (req, res) => {
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

    //get all order for admin

    app.get("/orders", async (req, res) => {
      const orders = await orderCollection.find().toArray();
      res.send(orders);
    });

    //get product details by id
    app.get("/purchase/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });

    //get order details by id for payment
    app.get("/payment/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    });

    //insert order
    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    //update order payment
    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paymentStatus: true,
          transactionId: payment.transactionId,
        },
      };

      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedOrder);

      // const id = req.params.id;
      // const payment = req.body;
      // const filter = { _id: ObjectId(id) };
      // const updateDoc = {
      //   $set: {
      //     paid: true,
      //     transactionId: payment.transactionId,
      //   },
      // };
      // const updateOrder = await orderCollection.updateOne(filter, updateDoc);

      // res.send(updateDoc);
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
      const filter = { _id: ObjectID(orderId) };
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    });

    //insert product
    app.post("/product", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
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

    // delete product
    app.delete("/product/:productId", verifyJWT, async (req, res) => {
      const productId = req.params.productId;
      const filter = { _id: ObjectID(productId) };
      const result = await productsCollection.deleteOne(filter);
      res.send(result);
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
      res.send(result);
    });

    // get all user
    app.get("/users", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    //make user role admin
    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
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
