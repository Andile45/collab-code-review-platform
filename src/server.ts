import express ,{application} from "express";
import dotenv from "dotenv"
import {testDBConnection} from "./config/database"


dotenv.config();
const PORT = process.env.PORT || 500;

const startServer = async () =>{
    await testDBConnection();

    application.listen(PORT,()=>{
        console.log(`Server is running on port https://localhost:${PORT}`)
    });
};

startServer();