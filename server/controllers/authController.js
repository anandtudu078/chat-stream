import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateTokens.js';

//Register a new user
//POST /api/auth/register
export const registerUser = async (req, res) =>{
    try{
        const {username, email, password } = req.body;

        if (!username || !email || !password ) {
            return res.status(400).json({ message: "All Fields Required"});
        }

        const userExists = await User.findOne({ $or: [{ email },{ username }] });
        if (userExists) {
            return res.status(400).json({ message: "User Already Exist"});
        }

        const user = await User.create({ username, email, password});

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        res.cookie("refreshToken",refreshToken,{
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "string",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            accessToken,
        });
    }catch(error){
        res.status(500).json({ message: error.message});
    }
};

//Login user
// POST /api/auth/login
export const loginUser = async (req, res) => {
    try{
        const { email, password } = res.body;

        const user = await User.findOne({ email });
        if(!user || !(await user.matchPassword(password))){
            return res.status(401).json({ message: "Invalid email or password"});
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            semeSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            accessToken,
        });
    }catch(error){
        res.status(500).json({ message: error.message});
    }
};