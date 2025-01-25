import {asyncHandler} from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { User } from "../model/user.model.js";
import {uploadCloudinary} from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
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
    User.findOne(
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
    .then((user)=>{
        if(user){
            throw new ApiError(409, "User already exists");
        }

    })
    
    const avatarLocalPath = req.files?.avatar[0].path;  
    const coverImageLocalPath = req.files?.coverImage[0].path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }
    // upload to cloudinary
    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Failed to upload avatar");
    }
    const user = await User.create({
        fullName,
        userName : userName.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage.url || ""
    })

    User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user");
    }
    return res.status(201).json(new ApiResponse(201, "User registered successfully", createdUser));
} )
export {registerUser}