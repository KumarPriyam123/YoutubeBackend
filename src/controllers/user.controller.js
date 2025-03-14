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
const changeCurrentPassword = asyncHandler(async (req, res) => {    
    const {oldPassword, newPassword} = req.body;
    const user = await User.findById(req.user?._id);
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid old Password");
    }
    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200)
    .json(200, req.user, "User details fetched successfully");
})
const updateAccountDetails = asyncHandler(async (req, res) => { 
    const {fullName, email} = req.body;
    if(!fullName || !email){
        throw new ApiError(400, "Full Name and Email are required");
    }
    const user = User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true // return updated document
        }
    ).select("-password ")
    return res.status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"))
})
;
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }   
    // Delete the existing avatar from cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(400, "Failed to upload avatar");
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password");
    return res.status(200)
    .json(new ApiResponse(200, user, "avatar Image  updated successfully"));
}
);
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const CoverLocalPath = req.file?.path;
    if(!CoverLocalPath){
        throw new ApiError(400, "coverImage is required");
    }   
    const cover = await uploadOnCloudinary(CoverLocalPath);
    if(!cover.url){
        throw new ApiError(400, "Failed to upload cover Image");
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: cover.url
            }
        },
        {
            new: true
        }
    ).select("-password");
    return res.status(200)
    .json(new ApiResponse(200, user, "cover Image  updated successfully"));
}
);
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username} = req.params    
    if(!username?.trim){
        throw new ApiError(400, "Username is required");    
    }
    const channel = await User.aggregate ([
        {
            $match: {
                username : username.toLowerCase()
            } 
            
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }   
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,   
                email: 1
            }
        }
        
    ])
    if(!channel?.length){
        throw new ApiError(404, "Channel not found");
    }
    return res.status(200)
    .json(new ApiResponse(200, channel[0], "Channel details fetched successfully"));
});
const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([ 
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        },
                        
                    },
                    {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                    }
                ]
            }
        }
    ])
    return res.status(200)
    .json(new ApiResponse(200, user[0]?.watchHistory , "Watch History fetched successfully")); 
});

export {
    registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar,updateUserCoverImage, getUserChannelProfile, getWatchHistory
}