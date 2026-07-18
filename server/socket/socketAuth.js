import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const socketAuth = async (socket , next) => {
    try{
        const token = socket.handshake.auth?.token;

        if(!token){
            return next(new Error("Not authorized, no token"));
        }


        const decoded = jwt.verify(token, process.env.jwt_ACCESS_SECRET);
        const user = await User.findById(decoded.id).select("-password-");


        if (!user){
            return next(new Error("User not found"));
        }

        socket.user = user;
        next();
    }catch(error){
        next(new Error("Not authorized, token failed"));
    }
};