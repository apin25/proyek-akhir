import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { SECRET } from "../utils/env";
import { IReqUser } from "../utils/interfaces";

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const [prefix, accessToken] = token.split(" ");

  if (prefix !== "Bearer" || !accessToken) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Token format is invalid" });
  }

  try {
    const user = jwt.verify(accessToken, SECRET) as {
      id: string;
      roles: string[];
    };
    (req as IReqUser).user = { id: user.id, roles: user.roles };
    next();
  } catch (err) {
    if (err instanceof Error) {
      return res.status(401).json({
        message: "Unauthorized: Token verification failed",
        error: err.message,
      });
    }
    return res
      .status(401)
      .json({ message: "Unauthorized: An unknown error occurred" });
  }
};

export default authenticate;
