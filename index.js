const express= require('express')
const app=express()
const cors=require('cors')
const admin = require("firebase-admin");
require('dotenv').config();

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port=process.env.PORT || 3000;


// #middleware
app.use(cors());
app.use(express.json())
// index.js
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Firebase accessToken Verfying
const verifyToken =async(req,res,next) =>{
  const authHeader=req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message:"Unauthorized"})
  }
  const token=authHeader.split(" ")[1]
  if(!token){
       return res.status(401).send({message:"Unauthorized"})
 
  }
  try {
    const decoded=await admin.auth().verifyIdToken(token)
    req.decoded=decoded
    // console.log(decoded)
    next()
  } catch  {
           return res.status(403).send({message:"Forbidden"})

  }

}


// userName :nikeproductdb
// password: 3YhQSkBo0weA48dy

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.due0kmg.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/',(req,res) => {
    res.send(`NIKE SNEKERS DATA LOADING >>>>>>>>>`)
})

// run Function
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


// create a database and collection 
const database=client.db('snekersdb');
const snekersColl=database.collection("snekers");
const bidsColl=database.collection("bids");
const usersColl=database.collection("users")

// ---users part API---
// 1# post API for users
app.post('/users',async(req,res) =>{
  const newUser=req.body;
  const query ={email:newUser.email}
  const existingUser= await usersColl.findOne(query)
  if(existingUser){
     res.send({message:'User Already exist in Database '})
  }else{
 const result=await usersColl.insertOne(newUser);
  res.send(result)
  }
 
})

// ---------products part API----------------
// 1#post
app.post('/products',async(req,res) =>{
    const newProduct=req.body;
    const result=await snekersColl.insertOne(newProduct);
    res.send(result)
})
//2# DELETE
app.delete('/products/:id',async(req,res) =>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)};
  const result=await snekersColl.deleteOne(query)
  res.send(result)
})


//3# GET 

app.get('/products',async(req,res) =>{
  // console.log(req.query)

  // query prameter(if client ask for give a category product we use this query parameter)

  const email=req.query.email;
  const location=req.query.location;
  
  const query={}
  if(location ){
    if(location){
      query.location=location;
    }
    if(email){
      query.email=email;
    }
  }

  const result=await snekersColl.find(query).toArray()
  res.send(result)
})


// GEt with limit skip and sort

// app.get('/products',async(req,res) => {
//   const sortField={price_max:-1};
//   const limitNum=5
//   const skipNum=5
//   const cursor=snekersColl.find().sort(sortField).limit(limitNum).skip(skipNum);
//   const result=await cursor.toArray();
//   res.send(result)
// })

// # GET THE LATEST PRODUCT 
app.get('/latestproducts',async(req,res) => {
  const sortField={created_at:-1};
  const limitNum=9;
  const cursor=snekersColl.find().sort(sortField).limit(limitNum);
  const result=await cursor.toArray();
  res.send(result)

})


//4# GET specific data from database
app.get("/products/:id",async(req,res) =>{
  const id=req.params.id;

  const query={
    _id:new ObjectId(id)
  }
  const result=await snekersColl.findOne(query)
  res.send(result)
})

//5# update product data
app.patch('/products/:id',async(req,res) => {
  const id=req.params.id;
  // the product data client give to update
  const updateProduct=req.body;

  const query={_id:new ObjectId(id)}
  const update ={
    $set:{
      name:updateProduct.name,
      price:updateProduct.price,
    }
  }
const result=await snekersColl.updateOne(query,update)
res.send(result)
  
})
// #6 get the sign in user product
app.get('/users/products',async(req,res) =>{
  const email=req.query.email;
  const query={}
  if(email){
    query.email=email
  }
  const result=await snekersColl.find(query).toArray()
  res.send(result);
})


//------------ #Bids part Api-------------------

// GET API FOR BIDS
app.get('/bids',verifyToken,async(req,res) =>{
  const result=await bidsColl.find().toArray()
  res.send(result)
})

// GET SPECIFIC BID FOR A PRODUCT BY _id
app.get('/bids/:id', async (req, res) => {
  const id = req.params.id;

  const query = { product: id };

  const result = await bidsColl.find(query).toArray();

  res.send(result);
});
// POST API FOR BIDS
app.post('/bids',async(req,res) => {
  const newBid=req.body;
  const result=await bidsColl.insertOne(newBid);
  res.send(result)
})

// DELETE API FOR BIDS
app.delete('/bids/:id',async(req,res) => {
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await bidsColl.deleteOne(query);
  res.send(result)
})

//  GET USER BID BY THEIR EMAIL

app.get('/users/bids',verifyToken, async (req, res) => {
  // console.log('token',req.headers.authorization)

  const email = req.query.email;
const query={}
if(email !== req.decoded.email){
  return res.status(403).send({message:"Forbidden"})
}
 if(email){
  query.buyer_email=email
 }


  const result = await bidsColl.find(query).toArray();

  res.send(result);
});




// PATCH FOR UPDATE BID PRICE AND STATUS
app.patch('/bids/:id',async(req,res) =>{
  const id=req.params.id;
  const UpdateBids=req.body;
  const query={
    _id:new ObjectId(id)
  };
const update={
  $set:{
    bid_price:UpdateBids.bid_price,
    status:UpdateBids.status
  }
}
const result=await bidsColl.updateOne(query,update)
res.send(result)
})

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
app.listen(port ,() => {
    console.log(`NIKE SNEKERS DATA LOADING >>>>>>>>> ${port}`)
})
run().catch(console.dir);