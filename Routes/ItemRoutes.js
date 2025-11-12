import express, { Router } from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { CheckiIsBox_Exist, CheckiIsBox_Use, GenerateTrqNumber, Get_Reference_TD, Get_TDIN_number, GetItemByBoxNumber, InsertHeaderDetail, InsertTo_trq_2, InsertTo_Trq_detail, SearchItem, Store_to_trq_header, UpdateBox } from "../Controller/ItemController.js";
import { StocNoValidatio } from "../Validation/iItemValidation.js";
import { GetLocationGroupInfo, LoadLocation, ValidateLocation } from "../Controller/sourceLocationGroup.js";
import { GetLocationByUserName } from "../Controller/userController.js";
import { CreateTask, CreateTaskSingleRecipient, Get_Items_For_ITR, Get_TDIN_number_By_Trq, GetNameRequestor, GetUserPendingTask, GetUserSub, Save_Internal_Transfer_Receiving, ScanBoxes, TaskCount, UpdateTaskForAcknowledge } from "../Controller/TaskController.js";
import { Check_Item_SKU, testSKU } from "../Controller/consignmentController.js";
import { BRAP_Get_Items_For_ITR } from "../Model/Task.js";

const router = express.Router();

// middleware for cookies
// router.use(cookieParser());

// ✅ verifyToken middleware
// function verifyToken(req, res, next) {
//   const token = req.cookies.jwt;

//   if (!token) {
//     return res.status(401).json({ success: false, message: "No token found" });
//   }

//   try {
//     const decoded = jwt.verify(token, "your_jwt_secret");
//     req.user = decoded;
//     next();
//   } catch (err) {
//     return res.status(403).json({ success: false, message: "Invalid or expired token" });
//   }
// }

// ======================
// 🔐 AUTH ROUTES
// ======================
// router.post("/login", async (req, res) => {
//   const result = await loginUser(req.body);

//   if (result.success) {
//     res.cookie("jwt", result.token, {
//       httpOnly: true,
//       secure: false, // set true if HTTPS
//       sameSite: "lax",
//       maxAge: 60 * 60 * 1000, // 1 hour
//     });
//   }

//   res.json(result);
// });

//  Test if token works
// router.get("/me", verifyToken, (req, res) => {
//   res.json({
//     success: true,
//     message: "Authorized user!",
//     user: req.user,
//   });
// });

// ======================
// 🔒 PROTECTED ROUTES
// ======================

// for searching items based on stock number
router.post("/seach-item", StocNoValidatio, SearchItem);

//  route for item location group
router.post("/location-group", GetLocationGroupInfo);

// validate the location
router.post("/validate-location", ValidateLocation);

// get TD info
router.get("/get-tdin", Get_Reference_TD);

// validate if the user has access to location
router.post("/get-user-access", GetLocationByUserName);

router.post('/generate-trq-number',GenerateTrqNumber);

router.post('/insert-to-trq-header',Store_to_trq_header);

router.post("/trq-detail", InsertTo_Trq_detail);

router.post('/get-tdin-number',Get_TDIN_number);

router.post('/insert-trq-detail2',InsertTo_trq_2);

router.post('/check-item-box',CheckiIsBox_Exist);

router.post('/check-box-already-use',CheckiIsBox_Use);

router.post('/get-item-per-box',GetItemByBoxNumber);

router.post('/update-boxing-header',UpdateBox);

router.post('/insert-to-header-detail',InsertHeaderDetail);

//  creating Tash

router.post('/get-user-pending-task-list',GetUserPendingTask);

router.post('/get-user-subscription',GetUserSub);

router.post('/create-task',CreateTask);

//  Second way to create Task By Single Recipient Only
router.post('/create-single-task',CreateTaskSingleRecipient);

router.post('/get_Items_for_itr',Get_Items_For_ITR)

router.post('/get-item-for-task-box-for-scanning',Get_Items_For_ITR);

router.get('/get-tdin-by-trq-number',Get_TDIN_number_By_Trq);

router.post('/save-internal-transfer',Save_Internal_Transfer_Receiving);

router.get('/get-requestor-name',GetNameRequestor);

router.post('/update-task-user',UpdateTaskForAcknowledge);

router.get('/get-count-task-per-user',TaskCount);


//  for scanning the Box Number
router.get('/scan-box',ScanBoxes);


//  For consignment
router.get('/get-location-group',LoadLocation);
router.post('/get-sku-result',Check_Item_SKU)

export const itemsRoutes = router;
