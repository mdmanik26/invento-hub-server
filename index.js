const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')

require('dotenv').config()
const app = express()
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ouuvt7g.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        const userCollection = client.db("inventoDB").collection("users");
        const shopCollection = client.db("inventoDB").collection("shops");
        const productCollection = client.db("inventoDB").collection("products");
        const cartCollection = client.db("inventoDB").collection("carts");
        const salesCollection = client.db("inventoDB").collection("sales");
        const subsCollection = client.db("inventoDB").collection("subscription");
        // middlewares
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        const verifyManager = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const isManager = user?.role === 'manager'
            if (!isManager) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        const verifyToken = async (req, res, next) => {
            // console.log('inside verify token', req.headers)
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.JSON_SECRET_KEY, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded
                next()
            })

        }


        // middlewares


        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            // console.log(email)
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })

            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })

        })

        app.get('/users/manager/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            // console.log(email)
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })

            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let manager = false
            if (user) {
                manager = user?.role === 'manager'
            }
            res.send({ manager })

        })



        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.JSON_SECRET_KEY, { expiresIn: '1h' })
            res.send({ token })
        })




        // carts
        app.post('/carts', verifyToken, verifyManager, async (req, res) => {
            const product = req.body
            // console.log(product)
            const result = await cartCollection.insertOne(product)
            res.send(result)
        })


        app.get('/carts/:email', verifyToken, verifyManager, async (req, res) => {
            const email = req.params.email
            // console.log(email)
            const query = { email: email }
            const result = await cartCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/carts/:email', verifyToken, verifyManager, async (req, res) => {
            const email = req.params.email
            console.log(email)
            const query = { email: email }
            const result = await cartCollection.deleteMany(query)
            res.send(result)
        })




        // sale

        app.post('/sales', async (req, res) => {
            const items = req.body
            // console.log(items);
            const result = await salesCollection.insertMany(items)
            res.send(result)
        })


        app.get('/sales/:email', verifyToken, verifyManager, async (req, res) => {
            const email = req.params.email
            console.log(email)
            const query = { email: email }
            const result = await salesCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/sales', verifyToken, verifyAdmin, async (req, res) => {
            const result = await salesCollection.find().toArray()
            res.send(result)
        })



        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ massage: 'This user is already saved in database' })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })


        // all users
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            // console.log(email)
            const query = { email: email }
            // console.log(query)
            const shop = await userCollection.findOne(query)
            res.send(shop)
        })

        app.post('/shops', async (req, res) => {
            const shop = req.body
            // console.log(shop);
            const query = { ownerEmail: shop.ownerEmail }
            // console.log(query)
            const existingShop = await shopCollection.findOne(query)
            // console.log(existingShop)
            if (existingShop) {
                return res.send({ message: 'You Can not create more than one shop' })
            }
            const result = await shopCollection.insertOne(shop)
            res.send(result)
        })


        app.patch('/users/manager/:email', async (req, res) => {
            const email = req.params.email
            const filter = { email: email }
            // console.log(filter)
            const updatedDoc = {
                $set: {
                    role: 'manager'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })



        // subscription and payment

        app.get('/subscription', async (req, res) => {
            const result = await subsCollection.find().toArray()
            res.send(result)
        })


        app.get('/subscription/:id', async (req, res) => {
            const id = req.params.id
            console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await subsCollection.findOne(query)
            res.send(result)
        })








        // shops

        app.get('/shops', verifyToken, verifyAdmin, async (req, res) => {
            const result = await shopCollection.find().toArray()
            res.send(result)
        })

        app.get('/shops/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            // console.log(email)
            const query = { ownerEmail: email }
            // console.log(query)
            const shop = await shopCollection.findOne(query)
            res.send(shop)
        })


        app.post('/products', verifyToken, verifyManager, async (req, res) => {
            const product = req.body
            // console.log(product)
            const result = await productCollection.insertOne(product)
            res.send(result)
        })


        app.get('/products/:email', verifyToken, verifyManager, async (req, res) => {
            const email = req.params.email
            // console.log(email)
            const query = { userEmail: email }
            // console.log(query);
            const result = await productCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.findOne(query)
            res.send(result)
        })

        app.get('/products', verifyToken, verifyAdmin, async (req, res) => {
            const result = await productCollection.find().toArray()
            res.send(result)
        })


        app.put('/product/:id', verifyToken, verifyManager, async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const updatedProduct = req.body;
            // console.log(updatedProduct)
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };

            const update = {
                $set: {
                    productName: updatedProduct.productName,
                    image: updatedProduct.image,
                    productQuantity: updatedProduct.productQuantity,
                    productLocation: updatedProduct.productLocation,
                    productionCost: updatedProduct.productionCost,
                    profitMargin: updatedProduct.profitMargin,
                    discount: updatedProduct.discount,
                    description: updatedProduct.description
                }
            }
            const result = await productCollection.updateOne(filter, update, options);
            res.send(result)

        })




        app.delete('/products/:id', verifyToken, verifyManager, async (req, res) => {
            const id = req.params.id
            // console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(query)
            res.send(result)
        })









        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('invento server is running')
})

app.listen(port, () => {
    console.log(`invento Hub is running on port : ${port}`)
})