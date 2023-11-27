const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express()
const cors = require('cors');
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
        await client.connect();
        const userCollection = client.db("inventoDB").collection("users");
        const shopCollection = client.db("inventoDB").collection("shops");

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


        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            console.log(email)
            const query = { email: email }
            const user = await userCollection.findOne(query)
            res.send(user)
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
            console.log(filter)
            const updatedDoc = {
                $set: {
                    role: 'manager'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })









        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
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