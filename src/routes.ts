import express from "express";
import authMiddleware from "./middleware/auth.middleware";
import aclMiddleware from "./middleware/acl.middleware";
import uploadMiddleware from "./middleware/upload.middleware";
import uploadController from "./controller/upload.controller";
import productsController from "./controller/products.controller";
import categoriesController from "./controller/categories.controller";
import authController from "./controller/auth.controller";
import orderController from "./controller/order.controller";

const router = express.Router();

router.get("/products", productsController.findAll);
router.post("/products", productsController.create);
router.get("/products/:id", productsController.findOne);
router.put("/products/:id", productsController.update);
router.delete("/products/:id", productsController.delete);

router.get("/categories", categoriesController.findAll);
router.post("/categories", categoriesController.create);
router.get("/categories/:id", categoriesController.findOne);
router.put("/categories/:id", categoriesController.update);
router.delete("/categories/:id", categoriesController.delete);

router.post("/auth/login", authController.login);
router.post("/auth/register", authController.register);
router.get(
  "/auth/me",
  authMiddleware,
  authController.me
);

router.post("/orders", authMiddleware, orderController.create, authController.me);
router.get("/orders", authMiddleware, orderController.getOrderHistory, authController.me);
router.put("/auth/profile", authMiddleware, authController.profile);

router.post("/upload", uploadMiddleware.single, uploadController.single);
router.post("/uploads", uploadMiddleware.multiple, uploadController.multiple);

export default router;
