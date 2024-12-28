import connectDB from "./db/index.js";
//require("dotenv").config({path: "./.env"});


import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
});
connectDB();

/*
import express from "express";
const app = express();
( async ()=>{
    try {
        mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        app.on("error", (error)=>{
            console.log("Error")
            throw error
        })
        app.listen(process.env.PORT, ()=>{
            console.log(`Server running on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("ERROR: ",error)
        throw error
    }
})()
    */