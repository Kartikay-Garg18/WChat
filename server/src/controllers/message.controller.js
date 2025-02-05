import { asyncHandler } from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import {upload} from "../utils/cloudinary.js";
import {getSocketId} from "../utils/socket.js";
import { GoogleUser } from "../models/googleuser.model.js";

const getUsersForSidebar=asyncHandler(async (req,res)=>{
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
        filteredUsers = [...filteredUsers,await GoogleUser.find({ _id: { $ne: loggedInUserId } }).select("-password")];
        res.status(200).json(new ApiResponse(200,{filteredUsers},"Users fetched successfully"));
      } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json(new ApiResponse(500,"","Internal server error"));
      }
});

const getMessages=asyncHandler(async (req,res)=>{
    try {
    const { id: friendId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: friendId },
        { senderId: friendId, receiverId: myId },
      ],
    });

    res.status(200).json(new ApiResponse(200,{messages},"Messages retrieved successfully"));
  } catch (error) {
    console.log("Error in getMessages : ", error.message);
    res.status(500).json(new ApiResponse(500,'',"Internal server error" ));
  }
});

const sendMessage=asyncHandler(async (req,res)=>{
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;
    
        let imageUrl;
        if (image) {
          const uploadResponse = upload(image);
          imageUrl = uploadResponse.secure_url;
        }
    
        const newMessage = new Message({
          senderId,
          receiverId,
          text,
          image: imageUrl,
        });
    
        await newMessage.save();
    
        const receiverSocketId = getSocketId(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newMessage", newMessage);
        }
    
        res.status(201).json(new ApiResponse(201,{newMessage},"Message sent successfully"));
      } catch (error) {
        console.log("Error in sendMessage : ", error.message);
        res.status(500).json(new ApiResponse(500,'',"Internal server error"));
      }
});

export {getUsersForSidebar,getMessages,sendMessage}