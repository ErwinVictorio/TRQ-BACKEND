// import { ExecuteRecordSetQry } from "../config/connect.js";
import { GetLocationAccess, loginUser } from "../Model/user.js";


// export async function login(req, res) {
//   const result = await loginUser(req.body);

//   if (!result.success) {
//     return res.status(400).json(result);
//   }

//   return res.json(result);
// }




// // Controller
export async function GetLocationByUserName(req, res) {
  try {
    const { username, location } = req.body;

    // ✅ validate
    if (!username || !location) {
      return res.status(400).json({
        success: false,
        message: "Missing username or location",
      });
    }

    const result = await GetLocationAccess(username, location);

    if (result) {
      return res.status(200).json({
        success: true,
        data: result,
      });
    }

  } catch (error) {
    console.error("GetLocationByUserName error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}



