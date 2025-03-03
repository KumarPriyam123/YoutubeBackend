import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    const uploadOnCloudinary = async (localFilePath) => {
        try {
            console.log("for cloudinary upload local path: ",localFilePath);
            if(!localFilePath) return null
            const response = await cloudinary.uploader.upload(localFilePath)    
                console.log("Response cloudinary",response) ;
                fs.unlinkSync(localFilePath) 
            console.log("File is uploaded to Cloudinary", response.url);
            return response
        } catch (error) {
            console.log("caught error in cloudinary");
            fs.unlinkSync(localFilePath) // remove file from local directory because of upload operation got failed
            return null
            
            
        }
    }
    export {uploadOnCloudinary}
