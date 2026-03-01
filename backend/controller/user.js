const express = require("express");
const path = require("path");
const User = require("../model/user");
const { upload, uploadToCloudinary } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/create-user", upload.single("file"), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userEmail = await User.findOne({ email });

    if (userEmail) {
      // User already exists
      return next(new ErrorHandler("User already exits", 400));
    }

    let avatarUrl = "";
    if (req.file) {
      // Upload to Cloudinary manually
      const result = await uploadToCloudinary(req.file.buffer);
      avatarUrl = result.secure_url;
    }

    const user = {
      name: name,
      email: email,
      password: password,
      avatar: avatarUrl,
    };

    // Directly create user without activation
    const createdUser = await User.create({
      name: user.name,
      email: user.email,
      password: user.password,
      avatar: user.avatar,
    });
    sendToken(createdUser, 201, res);
  } catch (err) {
    return next(new ErrorHandler(err.message, 400));
  }
});

// create activation token
const createActivationToken = (user) => {
  // why use create activatetoken?
  // to create a token for the user to activate their account  after they register
  return jwt.sign(user, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

// activate user account
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      const newUser = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );
      if (!newUser) {
        return next(new ErrorHandler("Invalid token", 400));
      }
      const { name, email, password, avatar } = newUser;

      let user = await User.findOne({ email });

      if (user) {
        return next(new ErrorHandler("User already exists", 400));
      }
      user = await User.create({
        name,
        email,
        avatar,
        password,
      });
      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// login user
router.post(
  "/login-user",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all filelds", 400));
      }
      const user = await User.findOne({ email }).select("+password");
      // +password is used to select the password field from the database

      if (!user) {
        return next(new ErrorHandler("user doesn't exits", 400));
      }

      // compore password with database password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct inforamtions", 400)
        );
      }
      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load user
router.get(
  "/getuser",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// log out user
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("token", null, {
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

// update user info
router.put(
  "/update-user-info",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password, phoneNumber, name } = req.body;

      /* The line `const user = await User.findOne({ email }).select("+password");` is querying the database
to find a user with the specified email address. The `select("+password")` part is used to include
the password field in the returned user object. By default, the password field is not selected when
querying the database for security reasons. However, in this case, the password field is needed to
compare the provided password with the stored password for authentication purposes. */
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      user.name = name;
      user.email = email;
      user.phoneNumber = phoneNumber;

      await user.save();

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user avatar
router.put(
  "/update-avatar",
  isAuthenticated,
  upload.single("image"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      let avatarUrl = "";
      if (req.file) {
        // Upload to Cloudinary manually
        const result = await uploadToCloudinary(req.file.buffer);
        avatarUrl = result.secure_url;
      }

      // Update user avatar
      const user = await User.findByIdAndUpdate(req.user.id, {
        avatar: avatarUrl,
      });

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user addresses
router.put(
  "/update-user-addresses",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      const sameTypeAddress = user.addresses.find(
        (address) => address.addressType === req.body.addressType
      );
      if (sameTypeAddress) {
        return next(
          new ErrorHandler(`${req.body.addressType} address already exists`)
        );
      }

      const existsAddress = user.addresses.find(
        (address) => address._id === req.body._id
      );

      if (existsAddress) {
        Object.assign(existsAddress, req.body);
      } else {
        // add the new address to the array
        user.addresses.push(req.body);
      }

      await user.save();

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete user address
router.delete(
  "/delete-user-address/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const addressId = req.params.id;

      //   console.log(addressId);

      await User.updateOne(
        {
          _id: userId,
        },
        { $pull: { addresses: { _id: addressId } } }
      );

      const user = await User.findById(userId);

      res.status(200).json({ success: true, user });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user password
router.put(
  "/update-user-password",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select("+password");

      const isPasswordMatched = await user.comparePassword(
        req.body.oldPassword
      );

      if (!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect!", 400));
      }

      /* The line `if (req.body.newPassword !== req.body.confirmPassword)` is checking if the value of
    `newPassword` in the request body is not equal to the value of `confirmPassword` in the request
    body. This is used to ensure that the new password entered by the user matches the confirmation
    password entered by the user. If the two values do not match, it means that the user has entered
    different passwords and an error is returned. */
      if (req.body.newPassword !== req.body.confirmPassword) {
        return next(
          new ErrorHandler("Password doesn't matched with each other!", 400)
        );
      }
      user.password = req.body.newPassword;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// find user infoormation with the userId
router.get(
  "/user-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all users --- for admin
router.get(
  "/admin-all-users",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const users = await User.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        users,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete users --- admin
router.delete(
  "/delete-user/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return next(
          new ErrorHandler("User is not available with this id", 400)
        );
      }

      await User.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "User deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// forgot password
router.post(
  "/forgot-password",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return next(new ErrorHandler("User not found with this email", 400));
      }

      // Create reset token
      const resetToken = createResetToken(user);

      const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

      try {
        await sendMail({
          email: user.email,
          subject: "Reset your password",
          message: `Hello ${user.name},\n\nPlease click on the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\nThis link will expire in 15 minutes.`,
        });

        res.status(200).json({
          success: true,
          message: `Please check your email: ${user.email} to reset your password!`,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// create reset token
const createResetToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.RESET_SECRET, {
    expiresIn: "15m",
  });
};

// verify reset token
router.post(
  "/verify-reset-token",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { token } = req.body;

      if (!token) {
        return next(new ErrorHandler("Token is required", 400));
      }

      const decoded = jwt.verify(token, process.env.RESET_SECRET);

      if (!decoded) {
        return next(new ErrorHandler("Invalid or expired token", 400));
      }

      res.status(200).json({
        success: true,
        message: "Token is valid",
      });
    } catch (error) {
      return next(new ErrorHandler("Invalid or expired token", 400));
    }
  })
);

// reset password
router.post(
  "/reset-password",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return next(new ErrorHandler("Token and new password are required", 400));
      }

      const decoded = jwt.verify(token, process.env.RESET_SECRET);

      if (!decoded) {
        return next(new ErrorHandler("Invalid or expired token", 400));
      }

      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      user.password = newPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Password reset successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler("Invalid or expired token", 400));
    }
  })
);

module.exports = router;
