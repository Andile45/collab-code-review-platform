import {Pool} from "pg"
import dotenv from "dotenv"

dotenv.config();

const pool = new Pool({
    user:process.env.DB_USER,
    host:process.env.DB_HOST,
    port:parseInt(process.env.DB_PORT || "5434"),
    password:process.env.DB_PASSWORD,
    database:process.env.DB_DATABSE
    
});

//Quering helper function
export const query = (text:string,params?:any[])=>pool.query(text,params)

export const testDBConnection = async ()=>{
    try {
        const client = await pool.connect()
        console.log('Database connection succesful');
        client.release()
    } catch (error) {
        console.log("Unable to connect to the database" , error)
        process.exit(1)
    }
}