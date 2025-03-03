import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import { User } from "../model/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken(); 
        
        const refreshToken = user.generateRefreshToken();   
        
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
        
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - non empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response 
    // check for user creation
    // return response


    


    const {fullName, userName, email, password} = req.body;
    console.log("email:", email);

    if(fullName === "" || userName === "" || email === "" || password === ""){
        throw new ApiError(400, "All fields are required"); 
    }
    await User.findOne(
        {
            $or: [
                {
                    userName
                },
                {
                    email
                }
            ]
        }
    )
    .then ((user)=>{
        if(user){
            throw new ApiError(409, "User already exists");
        }

    })
    
    const avatarLocalPath = req.files?.avatar[0]?.path; 
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath ;
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }
    
    // upload to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    console.log(avatar)
    let coverImage= null;
    if(coverImageLocalPath){
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }
    
    if(!avatar){
        throw new ApiError(400, "Failed to upload avatar");
    }
    const user = await User.create({
        fullName,
        userName : userName.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url
    })

    const createdUser= await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(new ApiResponse(201, "User registered successfully", createdUser));
} )
const loginUser = asyncHandler(async (req, res) => {
    //req body -> data
    // username or email
    // find the user
    // password check
    //access and refresh token
    // send cookies

    const {email,userName, password} = req.body;
    if(!email && !userName){
        throw new ApiError(400, "Email or username is required");
    }
    
    const user = await User.findOne({
        $or: [
            {
                email
            },
            {
                userName
            }
        ]
    })
    if(!user){
        throw new ApiError(404, "User not found");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid User Credentials");
    }
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const options = {
        httpOnly: true,
        secure: true
    }    
    return res.status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
        new ApiResponse(
            200,
            { 
                user: loggedInUser, accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    );  
})
const logoutUser = asyncHandler(async (req, res) => {
    // delete refresh token from db also from cookie
        await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    } 
    return res.status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)    
    .json(new ApiResponse(200, {},"User logged out successfully"));
});
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Request");
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(decodedToken?.id);
        if(!user){
            throw new ApiError(401, "Invalid refresh Token");
        }
        if(incomingRefreshToken!== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is expired or used");
        }
        const options = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, newRefreshToken}= await generateAccessAndRefreshTokens(user._id);
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)  
        .json(
            new ApiResponse(
                200,
                {
                    "AccessToken": accessToken,
                    "RefreshToken": newRefreshToken    
                },
                "Access Token Refreshed"
            )
        );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
        
    }
});
export {
    registerUser, loginUser, logoutUser, refreshAccessToken
}