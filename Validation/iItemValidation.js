import { checkSchema } from "express-validator";

export const StocNoValidatio = checkSchema({
  stockNo: {
    in: ["body"],
    trim: true,
    notEmpty: {
      errorMessage: "stock number is required",
    },
  },
});
