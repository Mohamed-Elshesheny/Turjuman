const express = require("express");
const userController = require("./../Controllers/userController");
const adminController = require("../Controllers/adminController");
const authController = require("./../Controllers/authController");
const Email = require("../utils/email");

const router = express.Router();

router.get("/test-invoice", async (req, res) => {
  const user = {
    name: "Mohamed",
    email: "Mohamedelshesheny62@gmail.com", // استخدم إيميلك هنا للتجربة
  };

  try {
    await new Email(user).sendInvoice([
      { name: "Translation Package - 10K words", amount: 299 },
      { name: "AI Summary Feature", amount: 50 },
    ]);

    res.send("Invoice sent successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error sending invoice");
  }
});

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post("/forgetPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.use(authController.protect);

router.get("/me", userController.getMe, userController.getUser);
router.delete("/deleteMe", userController.deleteMe);
router.patch(
  "/updateMe",
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.put("/UpdateUserInfo/:id", userController.updateUser);
router.delete("/:id", userController.deleteMe);
router.put("/ChangePassword/:id", authController.updateUserPassword);

router.use(authController.restricTo("admin"));

router.get("/top-users", adminController.getTopActiveUsers);
router.get("/Usage-Analytics", adminController.getUsageAnalytics);
router.route("/").get(userController.getAllUsers);
router.route("/:id").get(userController.getUser);

module.exports = router;
