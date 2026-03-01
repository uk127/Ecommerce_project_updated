const express = require("express");
const path = require("path");
const router = express.Router();
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const Shop = require("../model/shop");
const Product = require("../model/product");
const Event = require("../model/event");
const cloudinary = require("cloudinary").v2;
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const { upload, uploadToCloudinary } = require("../multer");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");

const sendShopToken = require("../utils/shopToken");

// Helper function to extract publicId from Cloudinary URL
const extractCloudinaryPublicId = (url) => {
  if (!url) return null;

  // If it's not a URL, assume it's already a publicId
  if (!url.startsWith("http")) {
    return url;
  }

  const uploadSegment = "/upload/";
  const uploadIndex = url.indexOf(uploadSegment);
  if (uploadIndex === -1) {
    return null;
  }

  let publicIdPath = url.substring(uploadIndex + uploadSegment.length);
  publicIdPath = publicIdPath.split("?")[0];

  const parts = publicIdPath.split("/");
  if (parts[0] && /^v\d+$/.test(parts[0])) {
    parts.shift();
  }

  const publicIdWithExt = parts.join("/");
  return publicIdWithExt.replace(/\.[^/.]+$/, "");
};

// Helper function to delete images from Cloudinary
const deleteImagesFromCloudinary = async (imageUrls) => {
  try {
    if (!imageUrls || imageUrls.length === 0) {
      console.log('No image URLs provided for deletion');
      return;
    }

    console.log('Deleting images from Cloudinary:', imageUrls);

    const publicIds = imageUrls
      .map((url) => {
        try {
          return extractCloudinaryPublicId(url);
        } catch (error) {
          console.log(`Error extracting public ID from URL ${url}:`, error.message);
          return null;
        }
      })
      .filter((id) => id !== null);

    console.log('Extracted public IDs:', publicIds);

    // Delete images from Cloudinary
    for (const publicId of publicIds) {
      try {
        console.log(`Attempting to delete image with public ID: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(`Cloudinary delete result for ${publicId}:`, result);
      } catch (error) {
        console.log(`Failed to delete image ${publicId}:`, error.message);
      }
    }
  } catch (error) {
    console.log('Error deleting images from Cloudinary:', error.message);
  }
};

// create shop
router.post("/create-shop", upload.single("file"), async (req, res, next) => {
  try {
    const { email } = req.body;
    const sellerEmail = await Shop.findOne({ email });

    if (sellerEmail) {
      // User already exists
      return next(new ErrorHandler("User already exists", 400));
    }

    let avatarUrl = "";
    if (req.file) {
      // Upload to Cloudinary manually
      const result = await uploadToCloudinary(req.file.buffer);
      avatarUrl = result.secure_url;
    }

    const seller = {
      name: req.body.name,
      email: email,
      password: req.body.password,
      avatar: avatarUrl,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber,
      zipCode: req.body.zipCode,
    };

    // For development: directly create the shop without email activation
    const newSeller = await Shop.create(seller);
    sendShopToken(newSeller, 201, res);

    // Uncomment below for production with email activation
    /*
    const activationToken = createActivationToken(seller);

    const activationUrl = `http://localhost:3000/seller/activation/${activationToken}`;

    try {
      await sendMail({
        email: seller.email,
        subject: "Activate your Shop",
        message: `Hello ${seller.name}, please click on the link to activate your shop: ${activationUrl}`,
      });
      res.status(201).json({
        success: true,
        message: `please check your email:- ${seller.email} to activate your shop!`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
    */
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// create activation token
const createActivationToken = (seller) => {
  return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

// activate user
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      const newSeller = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newSeller) {
        return next(new ErrorHandler("Invalid token", 400));
      }
      const { name, email, password, avatar, zipCode, address, phoneNumber } =
        newSeller;

      let seller = await Shop.findOne({ email });

      if (seller) {
        return next(new ErrorHandler("User already exists", 400));
      }

      seller = await Shop.create({
        name,
        email,
        avatar,
        password,
        zipCode,
        address,
        phoneNumber,
      });

      sendShopToken(seller, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// login shop
router.post(
  "/login-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all fields!", 400));
      }

      const user = await Shop.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User doesn't exists!", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      sendShopToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load shop
router.get(
  "/getSeller",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// log out from shop
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      res.status(201).json({
        success: true,
        message: "Log out successful!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get shop info
router.get(
  "/get-shop-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update shop profile picture
router.put(
  "/update-shop-avatar",
  isSeller,
  upload.single("image"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      let avatarUrl = "";
      if (req.file) {
        // Upload to Cloudinary manually
        const result = await uploadToCloudinary(req.file.buffer);
        avatarUrl = result.secure_url;
      }

      // Update shop avatar
      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        avatar: avatarUrl,
      });

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller info
router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, description, address, phoneNumber, zipCode } = req.body;

      const shop = await Shop.findOne(req.seller._id);

      if (!shop) {
        return next(new ErrorHandler("User not found", 400));
      }

      shop.name = name;
      shop.description = description;
      shop.address = address;
      shop.phoneNumber = phoneNumber;
      shop.zipCode = zipCode;

      await shop.save();

      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all sellers --- for admin
router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const sellers = await Shop.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

const deleteSellerCascade = catchAsyncErrors(async (req, res, next) => {
  try {
    const seller = await Shop.findById(req.params.id);

    if (!seller) {
      return next(new ErrorHandler("Seller is not available with this id", 400));
    }

    const sellerId = seller._id.toString();
    console.log(`Starting cascade deletion for seller: ${sellerId}`);

    // 1. Find all products belonging to this seller
    const products = await Product.find({ shopId: sellerId });
    console.log(`Found ${products.length} products for seller ${sellerId}`);

    // 2. Find all events belonging to this seller
    const events = await Event.find({ shopId: sellerId });
    console.log(`Found ${events.length} events for seller ${sellerId}`);

    // 3. Collect all image URLs to delete from Cloudinary
    const productImages = products.flatMap((product) => product.images || []);
    const eventImages = events.flatMap((event) => event.images || []);
    console.log(
      `Collected ${productImages.length} product images and ${eventImages.length} event images for deletion`
    );

    // 4. Delete product images from Cloudinary
    if (productImages.length > 0) {
      await deleteImagesFromCloudinary(productImages);
    }

    // 5. Delete event images from Cloudinary
    if (eventImages.length > 0) {
      await deleteImagesFromCloudinary(eventImages);
    }

    // 6. Delete seller avatar from Cloudinary (if exists)
    if (seller.avatar) {
      try {
        await deleteImagesFromCloudinary([seller.avatar]);
      } catch (error) {
        console.log("Failed to delete seller avatar:", error.message);
      }
    }

    // 7. Delete all products from MongoDB
    await Product.deleteMany({ shopId: sellerId });

    // 8. Delete all events from MongoDB
    await Event.deleteMany({ shopId: sellerId });

    // 9. Delete the seller from MongoDB
    await Shop.findByIdAndDelete(sellerId);

    res.status(201).json({
      success: true,
      message: `Seller and all associated products (${products.length}) and events (${events.length}) deleted successfully!`,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// delete seller ---admin (with cascade deletion)
router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  deleteSellerCascade
);

// delete seller ---admin (alias for Admin DELETE /seller/:id)
router.delete(
  "/seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  deleteSellerCascade
);

// update seller withdraw methods --- sellers
router.put(
  "/update-payment-methods",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { withdrawMethod } = req.body;

      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        withdrawMethod,
      });

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller withdraw merthods --- only seller
router.delete(
  "/delete-withdraw-method/",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("Seller not found with this id", 400));
      }

      seller.withdrawMethod = null;

      await seller.save();

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
