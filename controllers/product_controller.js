const Product = require('../models/productModel');
const User  = require('../models/userModel')
const asyncHandler = require('express-async-handler');
const slugify = require('slugify');
const {cloudinaryUploadImg,cloudinaryDeleteImg} = require('../utils/cloudinary');
const fs = require('fs');



// create product
const createProduct = asyncHandler(async(req,res)=>{
  try{
   if(req.body.title){
      req.body.slug = slugify(req.body.title);
    }
     const newProduct = await Product.create(req.body);
     res.json(newProduct);
    }catch(error){
    throw new Error(error);
   }
});


// update product
const updatedProduct = asyncHandler(async(req,res)=>{
   const id = req.params;
   try{
      if(req.body.title){
         req.body.slug = slugify(req.body.title);
      }
    const updateProduct = await Product.findOneAndUpdate({id},req.body,{new:true,});
    res.json(updateProduct);
   }catch(error){
      throw new Error(error);
   }
});


// get all products
const getAllProduct = asyncHandler(async(req,res)=>{
   try{
      // filtering
    const queryObj = { ...req.query };
    const excludeFields = ["page","sort","limit","fields"];
    excludeFields.forEach((el) => delete queryObj[el]);
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let query = Product.find(JSON.parse(queryStr));

    // sorting
    if(req.query.sort){
     const sortBy = req.query.sort.split(",").join(" ");
     query = query.sort(sortBy);
    }else{
     query = query.sort("-createdAt");
    }

    // limiting the fields
    if(req.query.fields){
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
     }else{
      query = query.select('--v');
     }

     // pagination
     const page = req.query.page;
     const limit = req.query.limit;
     const skip = (page-1) * limit;
     query = query.skip(skip).limit(limit);
     if(req.query.page){
      const productCount = await Product.countDocuments();
      if(skip >= productCount)throw new Error("The page does not exists");
     }
     console.log(page,limit,skip);

    const product = await query;
    res.json(product);
   }catch(error){
      throw new Error(error);
   }
});


//get product
const getaProduct = asyncHandler(async(req,res)=>{
   const {id} = req.params;
   try{
    const findProduct = await Product.findById(id);
    res.json(findProduct);
   }catch(error){
      throw new Error(error);
   }
});


// delete product
const deleteProduct = asyncHandler(async(req,res)=>{
   const {id} = req.params;
   try{
    const deleteProduct = await Product.findByIdAndDelete(id);
    res.json(deleteProduct);
   }catch(error){
      throw new Error(error);
   }
});


// add to wishlist product
const addToWishlist = asyncHandler(async(req,res)=>{
   const { _id } = req.user;
   const { prodId } = req.body;
    try{
      const user = await User.findById(_id);
      const alreadyadded = user.wishlist.find((id) => id.toString() === prodId);
      if(alreadyadded){
       let user = await User.findByIdAndUpdate(
         _id,
         {
           $pull : { wishlist: prodId},
         },
         {
            new:true,
         }
      );
      res.json(user);
      }
      else{
         let user = await User.findByIdAndUpdate(
            _id,
            {
              $push : { wishlist: prodId},
            },
            {
               new:true,
            }
         );
         res.json(user);
      }
   }catch(error){
     throw new Error(error);
   }
   
});


// rating 
const rating = asyncHandler(async(req,res)=>{
   const { _id } = req.user;
   const { star,prodId,comment } = req.body;
   
    try{
      const product = await Product.findById(prodId);
      let alreadyRated = product.ratings.find(
         (userId) => userId.postedby.toString() === _id.toString);
       if(alreadyRated){
       const updateRating = await Product.updateOne(
         {
           rating : { $elemMatch: alreadyRated},
         },
         {
            $set : { "ratings.$.star": star,"ratings.$.comment": comment},
         },
         {
            new:true,
         }
      );
      res.json(updateRating );
      }
      else{
         const rateProduct = await Product.findByIdAndUpdate(
            prodId,
            {
              $push : { 
                ratings:{
                  star:star,
                  comment:comment,
                  postedby:_id,
                }
              },
            },
            {
               new:true,
            }
         );
         res.json(rateProduct);
      }
      const getallratings = await Product.findById(prodId);
      let totalRating = getallratings.ratings.length;
      let ratingsum = getallratings.ratings
      .map((item)=>item.star)
      .reduce((prev, curr)=> prev + curr, 0);
      let actualRating = Math.round(ratingsum/totalRating);
      let finalproduct = await Product.findByIdAndUpdate(
         prodId,
         {
            totalRating: actualRating,
         },
         {
            new:true
         }
      );
      res.json(finalproduct)
   }catch(error){
     throw new Error(error);
   }  
});


// upload images
const uploadImages = asyncHandler(async(req,res)=>{
   const { id } = req.params;
   try{
      const uploader = (path) => cloudinaryUploadImg(path,"images");
      const urls = [];
      const files = req.files;
      for(const file of files){
         const {path} = file;
         const newPath = await uploader(path);
         urls.push(newPath);
        fs.unlinkSync(path);
      }
      const findProduct = await Product.findByIdAndUpdate(
         id,{
            images : urls.map((file)=>{
               return file;
            }),
         },
         {
            new: true,
         }
      ); 
      res.json(findProduct); 
   }
   catch(error){
      throw new Error(error);
   }
});


const deleteImages = asyncHandler(async(req,res)=>{
   const {id} = req.params;
   try{
     const deleted = cloudinaryDeleteImg(id, "images");
     res.json({ message: "Deleted" });
   }
   catch(error){
      throw new Error(error);
   }
});


module.exports = {createProduct,getAllProduct,getaProduct,deleteProduct,updatedProduct,addToWishlist,rating,uploadImages,deleteImages};