import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const userSchema = new Schema ({
    userName : {
        required : true,
        type : String,
        unique : true,
        lowercase : true,    
        trim : true,
        index: true, 
    },
    userName : {
        required : true,
        type : String,
        unique : true,
        lowercase : true,    
        trim : true,
        index: true // searching field enable
    },
    email : {
        required : true,
        type : String,
        unique : true,
        lowercase : true,    
        trim : true
    },
    userName : {
        required : true,
        type : String,
        unique : true,    
        trim : true,
        index: true
    }, 
    avatar : { 
        type : String, 
        required: true,
    },
    watchHistory : {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    password : {
        required : [true, "Password is required"],
        type : String
    },
    refreshToken : {    
        type : String
    },
},{
    timestamps : true   
})
userSchemas.pre(
    "save",
    async function(next){
        if(!this.isModified("password")){
            return next();
        }
        this.password = bcrypt.hash(this.password,10)
        next();
    }
)
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}
userSchema.methods.generateAccessToken = function(){
    jwt.sign({
        _id: this._id,
        userName: this.userName,
        email: this.email,
        fullName: this.fullName
    }
        , process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    })  
};
userSchema.methods.generateRefreshToken = function(){
    jwt.sign({
        _id: this._id
    }
        , process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    })   
};
export const User =  mongoose.model("User", userSchema);