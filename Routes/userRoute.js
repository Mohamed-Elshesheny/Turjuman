const express = require("express");
const userController = require("./../Controllers/userController");
const adminController = require("../Controllers/adminController");
const authController = require("./../Controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgetPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.use(authController.protect);

router.get("/me", userController.getMe, userController.getUser);
router.delete("/deleteMe", userController.deleteMe);
router.patch("/updateMe", userController.updateMe);
router.put("/UpdateUserInfo/:id", userController.updateUser);
router.delete("/:id", userController.deleteMe);
router.put("/ChangePassword/:id", authController.updateUserPassword);

router.use(authController.restricTo("admin"));

router.get("/top-users", adminController.getTopActiveUsers);
router.get("/Usage-Analytics", adminController.getUsageAnalytics);
router.route("/").get(userController.getAllUsers);
router.route("/:id").get(userController.getUser);

module.exports = router;
