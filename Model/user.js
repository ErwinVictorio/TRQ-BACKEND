import { ExecuteRecordSetQry } from "../config/connect.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// 🔐 Build AES key from ASCII MD5 (custom legacy logic)
function buildKeyFromAsciiMd5(keyString) {
    const md5 = crypto.createHash("md5");
    md5.update(Buffer.from(keyString, "ascii"));
    const temp = md5.digest();
    const hash = Buffer.alloc(32, 0);
    temp.copy(hash, 0, 0, 16);
    temp.copy(hash, 15, 0, 16);
    return hash;
}

// 🔓 AES-256-ECB Decryption with Base64 input
function decryptBase64Aes256EcbWithCustomKey(base64Cipher, keyString) {
    const key = buildKeyFromAsciiMd5(keyString);
    const decipher = crypto.createDecipheriv("aes-256-ecb", key, null);
    decipher.setAutoPadding(true);
    return decipher.update(base64Cipher, "base64", "utf8") + decipher.final("utf8");
}

// 🧩 MAIN LOGIN FUNCTION
export async function loginUser(body) {
    const { username, password } = body;
    const key = "1+1+1=3 (Personnel on MIS Department)";

    try {
        // ✅ Query includes s_password explicitly
        const query = `
      SELECT s_username, s_password 
      FROM mcjim_all_prog.dbo.user_accounts 
      WHERE s_username = '${username}'
    `;

        const result = await ExecuteRecordSetQry(query);
        console.log("Raw query result:", result);

        // ✅ Handle no result
        if (!result || result.length === 0) {
            return { success: false, message: "User not found" };
        }

        // ⚙️ Some DB functions return { recordset: [...] } — handle both
        const rows = result.recordset || result;
        const user = rows[0];
        console.log("User row:", user);

        if (!user || !user.s_password) {
            return { success: false, message: "User password not found" };
        }

        // 🔐 Decrypt password from DB
        const decryptedPassword = decryptBase64Aes256EcbWithCustomKey(
            user.s_password,
            key
        );

        console.log("Decrypted password:", decryptedPassword);

        // 🔎 Compare passwords
        if (password.trim() !== decryptedPassword.trim()) {
            return { success: false, message: "Invalid credentials" };
        }

        // 🪪 Generate JWT token
        const token = jwt.sign(
            { s_username: user.s_username },
            "your_jwt_secret",
            { expiresIn: "1h" }
        );

        // ✅ Success
        return {
            success: true,
            message: "Login successful",
            token,
            username: user.s_username
        };

    } catch (error) {
        console.error("Login model error:", error);
        return { success: false, message: "Server error", error: error.message };
    }
}




// check if the user has access to location group

export async function GetLocationAccess(username, locationCode) {

    console.log(username,locationCode)
  try {
    const query = `
      DECLARE @s_user VARCHAR(20) = UPPER('${username}');
      DECLARE @s_location_code VARCHAR(20) = RTRIM(UPPER('${locationCode}'));

      SELECT COUNT(*) AS accessCount
      FROM erpdata_new.dbo.location_code_rights
      WHERE user_id = @s_user
      AND s_location_code = @s_location_code;
    `;

    const result = await ExecuteRecordSetQry(query);

    // ✅ handle both array and recordset return types
    const data = result.recordset || result;
    return data;
  } catch (error) {
    console.error("GetLocationAccess error:", error);
    throw error;
  }
}
