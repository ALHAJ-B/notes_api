import dotenv from 'dotenv'
import { createApp } from './app.js'

dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set.');
    process.exit(1);
}

const app = createApp();
const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, ()=>{
    console.log(`Server up and running at port ${port}`)
});

const gracefulShutdown = async () => {
    console.log('Shutting down gracefully...');
    server.close(async () => {
        const { default: db } = await import('../db.js');
        db.close();
        process.exit(0);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);