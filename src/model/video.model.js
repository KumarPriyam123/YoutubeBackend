import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new Schema ({
    videoFile : {
        required : true,
        type : String, // cloudnary URL
    },
    title: {
        required : true,
        type : String, 
    },
    duration : {
        required : true,
        type : Number, // cloudnary URL 
    },
    description : {
        required : true,
        type : String, 
    },
    views : {
        type : Number,
        default : 0 
    },
    isPublished: {
        type: Boolean,
        default: True
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
},{
    timestamps : true   
})
videoSchema.plugin(mongooseAggregatePaginate);
export const Video = mongoose.model("Video", videoSchema);