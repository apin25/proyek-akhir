import { Request, Response } from "express";
import OrderModel from "../model/order.model";
import ProductsModel from "../model/products.model";
import UserModel from "../model/user.model"; // Add this import
import * as Yup from "yup";
import { IReqUser } from "../utils/interfaces";
import mailService from "../utils/mail"; // Adjust the import path as needed

interface IPaginationQuery {
  page: number;
  limit: number;
  search?: string;
}

const createOrderValidationSchema = Yup.object().shape({
  grandTotal: Yup.number().required(),
  orderItems: Yup.array()
    .of(
      Yup.object().shape({
        name: Yup.string().required(),
        productId: Yup.string().required(),
        price: Yup.number().required(),
        quantity: Yup.number().required().min(1).max(5),
      })
    )
    .required(),
});

export default {
  async create(req: Request, res: Response) {
    try {
      const userId = (req as IReqUser).user.id;

      await createOrderValidationSchema.validate(req.body);

      const { orderItems, grandTotal } = req.body;

      for (const item of orderItems) {
        const product = await ProductsModel.findById(item.productId);
        if (!product) {
          return res.status(400).json({ message: "Product not found" });
        }
        if (item.quantity > product.qty) {
          return res
            .status(400)
            .json({ message: "Insufficient product quantity" });
        }
      }

      const newOrder = new OrderModel({
        ...req.body,
        createdBy: userId,
      });

      await newOrder.save();

      for (const item of orderItems) {
        await ProductsModel.findByIdAndUpdate(item.productId, {
          $inc: { qty: -item.quantity },
        });
      }

      // Fetch the user details
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      const currentYear = new Date().getFullYear();
      // Send invoice email
      const emailContent = await mailService.render("invoice.ejs", {
        customerName: user.fullName, // Pass user name to the template
        user,
        order: newOrder,
        orderItems,
        grandTotal,
        contactEmail:"cropnesia@gmail.com", // Include contact email in the rendering context
        companyName: "Belandja", // Include company name
        year: currentYear,
      });

      await mailService.send({
        to: user.email,
        subject: "Your Order Invoice",
        content: emailContent,
      });

      res.status(201).json({
        data: newOrder,
        message: "Order created successfully",
      });
    } catch (error) {
      if (error instanceof Yup.ValidationError) {
        res.status(400).json({
          data: error.errors,
          message: "Validation failed",
        });
      } else {
        const err = error as Error;
        res.status(500).json({
          data: err.message,
          message: "Failed to create order",
        });
      }
    }
  },

  async getOrderHistory(req: Request, res: Response) {
    try {
      const userId = (req as IReqUser).user.id;
      const { limit = 10, page = 1 } = req.query as unknown as IPaginationQuery;

      const parsedLimit = parseInt(limit.toString(), 10);
      const parsedPage = parseInt(page.toString(), 10);

      if (isNaN(parsedLimit) || isNaN(parsedPage)) {
        return res
          .status(400)
          .json({ message: "Invalid pagination parameters" });
      }

      const orders = await OrderModel.find({ createdBy: userId })
        .limit(parsedLimit)
        .skip((parsedPage - 1) * parsedLimit)
        .sort({ createdAt: -1 });

      const total = await OrderModel.countDocuments({ createdBy: userId });

      res.status(200).json({
        data: orders,
        message: "Success get order history",
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        data: err.message,
        message: "Failed to get order history",
      });
    }
  },
};